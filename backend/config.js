// Business rule values in one place, so they are easy to change later
module.exports = {
  SEATING_MINUTES: 120,     // every table may be used for 2 hours
  WARNING_MINUTES: 15,      // show yellow when less than 15 minutes remain
  LATE_LIMIT_MINUTES: 30,   // reservation becomes No-show after 30 minutes late
  BAHT_PER_POINT: 10,       // members earn 1 point per 10 baht (to be confirmed)
};