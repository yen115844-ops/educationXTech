const User = require('../models/User');
const Course = require('../models/Course');
const Payment = require('../models/Payment');
const Post = require('../models/Post');
const Enrollment = require('../models/Enrollment');

const stats = async (req, res) => {
  try {
    const [usersTotal, coursesTotal, paymentsTotal, postsTotal, enrollmentsTotal] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Payment.countDocuments(),
      Post.countDocuments(),
      Enrollment.countDocuments(),
    ]);
    const paymentsCompleted = await Payment.countDocuments({ status: 'completed' });
    const revenueCompleted = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then((r) => (r[0] && r[0].total) || 0);
    res.success({
      users: usersTotal,
      courses: coursesTotal,
      payments: paymentsTotal,
      posts: postsTotal,
      enrollments: enrollmentsTotal,
      paymentsCompleted,
      coursesPublished: await Course.countDocuments({ isPublished: true }),
      revenueCompleted,
    });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const DAYS_CHART = 30;

function getStartDate(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

const charts = async (req, res) => {
  try {
    const start = getStartDate(DAYS_CHART);
    const [usersByDay, paymentsByDay, enrollmentsByDay, userRoles, paymentStatus, topCoursesByEnrollments] =
      await Promise.all([
        User.aggregate([
          { $match: { createdAt: { $gte: start } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        Payment.aggregate([
          { $match: { createdAt: { $gte: start } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
              amount: { $sum: '$amount' },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Enrollment.aggregate([
          { $match: { createdAt: { $gte: start } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
        Payment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Enrollment.aggregate([
          { $group: { _id: '$courseId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
          { $unwind: '$course' },
          { $project: { title: '$course.title', count: 1, _id: 0 } },
        ]),
      ]);

    res.success({
      usersByDay: usersByDay.map((x) => ({ date: x._id, count: x.count })),
      paymentsByDay: paymentsByDay.map((x) => ({ date: x._id, count: x.count, amount: x.amount })),
      enrollmentsByDay: enrollmentsByDay.map((x) => ({ date: x._id, count: x.count })),
      userRoles: userRoles.map((x) => ({ role: x._id, count: x.count })),
      paymentStatus: paymentStatus.map((x) => ({ status: x._id, count: x.count })),
      topCoursesByEnrollments: topCoursesByEnrollments.map((x) => ({ title: x.title, count: x.count })),
    });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

module.exports = { stats, charts };
