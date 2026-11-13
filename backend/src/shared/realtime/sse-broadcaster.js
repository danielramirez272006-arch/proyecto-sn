class SseBroadcaster {
  constructor() {
    this.channels = new Map(); // channelName -> Set of res objects
  }

  subscribe(channelName, res) {
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, new Set());
    }
    const clients = this.channels.get(channelName);
    clients.add(res);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', channel: channelName, timestamp: new Date().toISOString() })}\n\n`);

    const cleanup = () => {
      clients.delete(res);
      if (clients.size === 0) {
        this.channels.delete(channelName);
      }
    };

    res.on('close', cleanup);
    res.on('finish', cleanup);
  }

  broadcast(channelName, eventType, data = {}) {
    const clients = this.channels.get(channelName);
    if (!clients || clients.size === 0) return 0;

    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
      try {
        client.write(payload);
      } catch (err) {
        clients.delete(client);
      }
    }
    return clients.size;
  }

  getChannelSubscriberCount(channelName) {
    return this.channels.get(channelName)?.size || 0;
  }
}

module.exports = new SseBroadcaster();

