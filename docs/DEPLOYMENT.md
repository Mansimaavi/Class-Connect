# Deploying ClassConnect to AWS

Production runs on a single EC2 instance (free-tier sized) behind automatic HTTPS. GitHub Actions builds the Docker images, pushes them to Amazon ECR and rolls them out on the instance through AWS Systems Manager. There's no SSH, and no AWS keys are stored in GitHub.

```
GitHub Actions ──OIDC──▶ IAM role ──▶ ECR (classconnect-api, classconnect-web)
       │                                 │
       └──── SSM Run Command ──▶ EC2 ────┘ docker compose pull && up
                                  │
             internet ──▶ Caddy :443 ──▶ nginx (React build) ──▶ Node API ──▶ MongoDB Atlas
                                  │
                                  └──▶ CloudWatch Logs (/classconnect/prod)
```

| Piece | Where it's defined |
| --- | --- |
| ECR repos, EC2 + Elastic IP, security group, IAM roles, GitHub OIDC, log group | `infra/aws/classconnect.yml` (CloudFormation) |
| Production containers (api, web, caddy) | `deploy/docker-compose.prod.yml`, `deploy/Caddyfile` |
| Rollout on the instance: load secrets, pull, restart, health check, rollback | `deploy/remote-deploy.sh` |
| Pipeline | `.github/workflows/ci-cd.yml`, `.github/scripts/ssm-deploy.sh` |

You need an AWS account, the [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) configured with an admin profile (`aws configure`), and a free MongoDB Atlas cluster. The examples use `ap-south-1` (Mumbai). Any region works.

---

## 1. Create the database (MongoDB Atlas)

1. Create a free **M0** cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Database Access** → add a user with a strong password.
3. **Network Access** → for now allow `0.0.0.0/0`. After step 2 you can restrict it to the instance's Elastic IP.
4. **Connect → Drivers** → copy the connection string and add a database name:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/classconnect?retryWrites=true&w=majority`

## 2. Create the AWS infrastructure

```bash
aws cloudformation deploy \
  --region ap-south-1 \
  --stack-name classconnect \
  --template-file infra/aws/classconnect.yml \
  --capabilities CAPABILITY_NAMED_IAM
```

If your account already has the GitHub OIDC provider (`token.actions.githubusercontent.com`), add `--parameter-overrides CreateGitHubOidcProvider=false`. If you forked the repo, also override `GitHubOwner` / `GitHubRepo`.

Read the outputs. You'll need them in the next steps:

```bash
aws cloudformation describe-stacks --region ap-south-1 --stack-name classconnect \
  --query "Stacks[0].Outputs" --output table
```

| Output | Used for |
| --- | --- |
| `InstanceId` | GitHub variable `EC2_INSTANCE_ID` |
| `AppDomain` | GitHub variable `APP_DOMAIN`, e.g. `13.233.10.20.sslip.io` |
| `DeployRoleArn` | GitHub secret `AWS_DEPLOY_ROLE_ARN` |
| `PublicIp` | Atlas network access allow-list |

`AppDomain` uses [sslip.io](https://sslip.io), which resolves `<ip>.sslip.io` to that IP. That gives you a real hostname with a Let's Encrypt certificate without buying a domain. To use your own domain, point an `A` record at `PublicIp` and use that name as `APP_DOMAIN` instead.

## 3. Store the production settings

The API reads its configuration from SSM Parameter Store (encrypted `SecureString`s). Nothing secret goes into git or GitHub.

```bash
cp Backend/.env.example .env.production
```

Fill in at least:

```dotenv
MONGO_URI=mongodb+srv://...            # from step 1
JWT_ACCESS_SECRET=...                  # openssl rand -hex 32
JWT_REFRESH_SECRET=...                 # openssl rand -hex 32 (different value)
TWO_FACTOR_ENCRYPTION_KEY=...          # openssl rand -hex 32
CLIENT_URL=https://13.233.10.20.sslip.io   # https:// + APP_DOMAIN
APP_URL=https://13.233.10.20.sslip.io
```

Then for email, either set SMTP (`MAIL_HOST`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`; for Gmail use an [app password](https://support.google.com/accounts/answer/185833)) or set `EMAIL_DELIVERY=log` to print codes to the logs while testing. Add the Cloudinary keys for uploads and `GEMINI_API_KEY` for PDF summaries.

Leave `NODE_ENV`, `PORT` and `TRUST_PROXY` out. The compose file sets them.

```bash
./infra/aws/put-secrets.sh .env.production ap-south-1
rm .env.production
```

Re-run the script whenever a value changes. The next deploy picks it up.

## 4. Connect GitHub

In the repository: **Settings → Secrets and variables → Actions**

- **Secrets** → `AWS_DEPLOY_ROLE_ARN` = `DeployRoleArn`
- **Variables**
  - `AWS_REGION` = `ap-south-1`
  - `EC2_INSTANCE_ID` = `InstanceId`
  - `APP_DOMAIN` = `AppDomain`
  - `AWS_DEPLOY_ENABLED` = `true`

Then **Settings → Environments → New environment** → `production`. You can add yourself as a required reviewer if you want to approve each release.

## 5. Deploy

Push to `main`, or run the workflow manually (**Actions → CI/CD → Run workflow**). The pipeline:

1. lints and tests the backend against a real MongoDB service container and the frontend with Vitest
2. builds both Docker images
3. pushes them to ECR tagged with the commit SHA and `latest`
4. sends `deploy/` to the instance over SSM and runs `remote-deploy.sh`, which loads the secrets, pulls the new images, restarts the stack and waits for `/api/health/ready`
5. rolls back to the previous release automatically if the new one doesn't become healthy
6. smoke-tests `https://APP_DOMAIN` from the runner

The first deploy takes a few minutes longer while Caddy gets the TLS certificate.

## 6. Create the first admin

Sign up on the live site, then promote your account:

```bash
aws ssm start-session --region ap-south-1 --target <InstanceId>
# on the instance
cd /opt/classconnect
sudo docker compose --env-file release.env -f docker-compose.prod.yml exec api \
  node scripts/createSuperAdmin.js --email you@example.com
```

(`start-session` needs the [Session Manager plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html).) You can also run `npm run seed:admin -- --email you@example.com` from your laptop with `MONGO_URI` pointing at Atlas.

---

## Operating it

**Logs.** All three containers ship to CloudWatch Logs:

```bash
aws logs tail /classconnect/prod --region ap-south-1 --follow
```

**Roll back by hand.** Re-run the workflow for an older commit, or on the instance set `IMAGE_TAG` in `release.env` to an earlier SHA and run `docker compose ... up -d`.

**Moving data from the old version.** If you have data from the first version of the app (folders, PDFs), run the migration once against that database:

```bash
cd Backend
MONGO_URI=... node scripts/migrateLegacyData.js --dry-run
MONGO_URI=... node scripts/migrateLegacyData.js --fallback-author <your user id>
```

**Cost.** On a new account, `t3.micro`/`t2.micro`, 20 GB of gp3, ECR storage under 500 MB and Atlas M0 are covered by the free tiers. An Elastic IP attached to a running instance has an hourly charge for public IPv4 (about $3.60/month). Delete everything with:

```bash
aws cloudformation delete-stack --region ap-south-1 --stack-name classconnect
aws ssm delete-parameters --region ap-south-1 --names $(aws ssm get-parameters-by-path \
  --region ap-south-1 --path /classconnect/prod --query "Parameters[].Name" --output text)
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Deploy job is skipped | `AWS_DEPLOY_ENABLED` must be exactly `true`, and the push must be to `main`. |
| `Not authorized to perform sts:AssumeRoleWithWebIdentity` | The `production` environment must exist, and `GitHubOwner`/`GitHubRepo` in the stack must match the repo. |
| `No parameters found under /classconnect/prod` | Run `put-secrets.sh` in the same region as the stack. |
| API container keeps restarting | `aws logs tail /classconnect/prod --follow`. Usually a missing `MONGO_URI`/secret or Atlas blocking the instance IP. |
| Password-reset emails link to `localhost` | Set `APP_URL` (or `CLIENT_URL`) to the `https://` address of the site and redeploy. |
| Certificate errors right after the first deploy | Wait a minute for Let's Encrypt. Ports 80 and 443 must be reachable. |
