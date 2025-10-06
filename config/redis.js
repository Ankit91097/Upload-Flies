const Redis = require("ioredis");

const redis = new Redis({
  port: process.env.REDIS_PORT, // Redis port
  host: process.env.REDIS_HOST, // Redis host
  password: process.env.REDIS_PASSWORD
});

redis.on("connect", () => {
    console.log("Connected to Redis");
})


module.exports = redis;