/**
 * One-off migration from the first version of the schema:
 *   folders (+ embedded pdfs)  -> classrooms, resources, progress
 *   messages/polls .folder     -> .classroom
 *   pdfs (public notes)        -> classnotes
 *   questions/answers          -> new field names (needs --fallback-author for
 *                                 posts that were saved without an author)
 *   usernames                  -> lowercase
 *
 *   node scripts/migrateLegacyData.js --dry-run
 *   node scripts/migrateLegacyData.js --fallback-author <userId>
 *
 * Safe to re-run: anything already migrated is skipped. Classrooms keep the
 * old folder _id, so chat history, polls and whiteboards stay linked.
 */
import { parseArgs } from "node:util";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/database.js";
import Classroom from "../models/classroom.js";

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    "fallback-author": { type: "string" },
  },
});
const dryRun = values["dry-run"];
const fallbackAuthor = values["fallback-author"] ? new mongoose.Types.ObjectId(values["fallback-author"]) : null;
const stats = {};
const count = (key, n = 1) => {
  stats[key] = (stats[key] || 0) + n;
};

const run = async () => {
  await connectDB();
  const db = mongoose.connection.db;
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
  const write = async (fn) => {
    if (!dryRun) await fn();
  };

  if (existing.has("folders")) {
    for await (const folder of db.collection("folders").find()) {
      if (await db.collection("classrooms").findOne({ _id: folder._id })) continue;

      let joinCode = String(folder.uniqueKey || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (joinCode.length < 6 || joinCode.length > 12 || (await db.collection("classrooms").findOne({ joinCode }))) {
        joinCode = Classroom.generateJoinCode();
      }
      const ownerId = folder.createdBy;
      const memberIds = [...new Set([ownerId, ...(folder.members || [])].filter(Boolean).map(String))];

      await write(() =>
        db.collection("classrooms").insertOne({
          _id: folder._id,
          name: folder.name,
          subject: folder.subject,
          description: folder.description || "",
          joinCode,
          owner: ownerId,
          members: memberIds.map((id) => ({
            user: new mongoose.Types.ObjectId(id),
            role: id === String(ownerId) ? "teacher" : "student",
            joinedAt: folder.createdAt || new Date(),
          })),
          isArchived: false,
          createdAt: folder.createdAt || new Date(),
          updatedAt: new Date(),
        })
      );
      count("classrooms");

      for (const pdf of folder.pdfs || []) {
        await write(() =>
          db.collection("resources").insertOne({
            _id: pdf._id,
            classroom: folder._id,
            name: pdf.name,
            url: pdf.path,
            publicId: pdf.publicId,
            resourceType: "image",
            mimeType: /\.pdf($|\?)/i.test(pdf.path || "") ? "application/pdf" : undefined,
            size: 0,
            uploadedBy: pdf.uploadedBy || ownerId,
            downloadCount: (pdf.downloadedBy || []).length,
            downloadedBy: (pdf.downloadedBy || []).filter((d) => d?.user).map((d) => ({ user: d.user, at: d.date || new Date() })),
            createdAt: pdf.createdAt || new Date(),
            updatedAt: new Date(),
          })
        );
        count("resources");

        for (const entry of pdf.progressByUser || []) {
          if (!entry?.user) continue;
          await write(() =>
            db.collection("progresses").updateOne(
              { user: entry.user, resource: pdf._id },
              {
                $setOnInsert: {
                  classroom: folder._id,
                  completed: Boolean(entry.completed),
                  completedAt: entry.completed ? entry.updatedAt || new Date() : null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              },
              { upsert: true }
            )
          );
          count("progress");
        }
      }
    }
  }

  for (const name of ["messages", "polls"]) {
    if (!existing.has(name)) continue;
    const filter = { folder: { $exists: true }, classroom: { $exists: false } };
    const pending = await db.collection(name).countDocuments(filter);
    await write(() => db.collection(name).updateMany(filter, { $rename: { folder: "classroom" } }));
    count(name, pending);
  }

  if (existing.has("pdfs")) {
    for await (const pdf of db.collection("pdfs").find()) {
      if (await db.collection("classnotes").findOne({ _id: pdf._id })) continue;
      const ratings = (pdf.ratings || []).filter((r) => r?.userId).map((r) => ({ user: r.userId, value: r.rating }));
      const average = ratings.length ? Math.round((ratings.reduce((s, r) => s + r.value, 0) / ratings.length) * 10) / 10 : 0;
      await write(() =>
        db.collection("classnotes").insertOne({
          _id: pdf._id,
          title: pdf.name,
          topic: pdf.topic || "General",
          subject: "General",
          url: pdf.path,
          publicId: pdf.publicId,
          resourceType: "image",
          uploadedBy: pdf.uploadedBy,
          ratings,
          reviews: (pdf.reviews || []).filter((r) => r?.user).map((r) => ({ user: r.user, text: r.review, createdAt: r.createdAt || new Date(), updatedAt: new Date() })),
          averageRating: average,
          ratingCount: ratings.length,
          viewCount: 0,
          createdAt: pdf.createdAt || new Date(),
          updatedAt: new Date(),
        })
      );
      count("classnotes");
    }
  }

  if (existing.has("questions")) {
    for await (const question of db.collection("questions").find({ questionName: { $exists: true } })) {
      if (!question.user && !fallbackAuthor) {
        count("questions skipped (no author; pass --fallback-author)");
        continue;
      }
      const answerCount = existing.has("answers") ? await db.collection("answers").countDocuments({ questionId: question._id }) : 0;
      await write(() =>
        db.collection("questions").updateOne(
          { _id: question._id },
          {
            $set: { title: question.questionName, details: "", imageUrl: question.questionUrl || null, author: question.user || fallbackAuthor, answerCount, updatedAt: new Date() },
            $unset: { questionName: "", questionUrl: "", answers: "", user: "" },
          }
        )
      );
      count("questions");
    }
  }

  if (existing.has("answers")) {
    for await (const answer of db.collection("answers").find({ questionId: { $exists: true } })) {
      if (!answer.user && !fallbackAuthor) {
        count("answers skipped (no author; pass --fallback-author)");
        continue;
      }
      await write(() =>
        db.collection("answers").updateOne(
          { _id: answer._id },
          {
            $set: { question: answer.questionId, author: answer.user || fallbackAuthor, text: answer.text || "", photoUrl: answer.photo || null, updatedAt: new Date() },
            $unset: { questionId: "", photo: "", likes: "", dislikes: "", user: "" },
          }
        )
      );
      count("answers");
    }
  }

  for await (const user of db.collection("users").find({ username: /[A-Z]/ })) {
    const lower = user.username.toLowerCase();
    if (await db.collection("users").findOne({ username: lower, _id: { $ne: user._id } })) {
      count(`usernames left as-is (would clash): ${user.username}`);
      continue;
    }
    await write(() => db.collection("users").updateOne({ _id: user._id }, { $set: { username: lower } }));
    count("usernames lowercased");
  }

  console.log(dryRun ? "Dry run, nothing was written. Would migrate:" : "Migrated:", stats);
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
