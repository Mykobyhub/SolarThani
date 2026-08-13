// PM2 process manager config — keeps the app alive across SSH disconnects/crashes/reboots.
// รันจาก VPS: pm2 start deploy/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'solarthani',
      cwd: __dirname + '/../frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
      time: true,
    },
  ],
};
