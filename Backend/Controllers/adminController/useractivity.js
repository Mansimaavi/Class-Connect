import User from '../../models/User.js';

export const getActivityLog = async (req, res) => {
  try {
    // IST offset in milliseconds
    const istOffsetMs = 5.5 * 60 * 60 * 1000;

    const now = new Date();
    const istNow = new Date(now.getTime() + istOffsetMs);

    // Get today start and end in IST
    const todayStartIST = new Date(istNow);
    todayStartIST.setHours(0, 0, 0, 0);

    const todayEndIST = new Date(istNow);
    todayEndIST.setHours(23, 59, 59, 999);

    // Convert to UTC for querying MongoDB
    const todayStartUTC = new Date(todayStartIST.getTime() - istOffsetMs);
    const todayEndUTC = new Date(todayEndIST.getTime() - istOffsetMs);

  

    const activityStats = await User.aggregate([
      { $unwind: '$activityLog' },
      {
        $match: {
          'activityLog.date': {
            $gte: todayStartUTC,
            $lt: todayEndUTC,
          }
        }
      },
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          totalLogins: { $sum: '$activityLog.logins' },
          totalTimeSpent: { $sum: '$activityLog.totalTimeSpent' },
        },
      },
      { $sort: { totalTimeSpent: -1 } }
    ]);

    res.status(200).json(activityStats);
  } catch (error) {
    console.error('Error fetching user activity stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



export const getOverallActivityStats = async (req, res) => {
  try {
    const userStats = await User.aggregate([
      { 
        $unwind: '$activityLog' 
      },
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          totalLogins: { $sum: '$activityLog.logins' },
          totalTimeSpent: { $sum: '$activityLog.totalTimeSpent' },
        },
      },
      { $sort: { name: 1 } }
    ]);

    res.status(200).json(userStats);
  } catch (error) {
    console.error('Error fetching per-user overall activity stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

