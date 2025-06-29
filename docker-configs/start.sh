#!/bin/bash

# 初始化 MongoDB 数据库
if [ ! -f /data/db/.initialized ]; then
    echo "Initializing MongoDB..."
    
    # 启动 MongoDB（无认证模式）
    mongod --fork --logpath /var/log/mongodb/mongod.log --dbpath /data/db --bind_ip 127.0.0.1
    
    # 等待 MongoDB 启动
    sleep 10
    
    # 执行初始化脚本
    mongosh < /docker-entrypoint-initdb.d/init-mongo.js
    
    # 停止 MongoDB
    mongod --shutdown --dbpath /data/db
    
    # 标记已初始化
    touch /data/db/.initialized
    
    echo "MongoDB initialization completed"
fi

# 启动所有服务
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf