import net from 'net';
let client;
let retryTimeout;

async function onData(data) {
  console.log(data);
}

async function onError(err) {
  if (err.message.indexOf('ECONNREFUSED') > -1) {
    // do recconect
    console.log('Attempting to reconnect shortly');
    setTimeout(() => {
      client = create();
      client.on('data', onData);
      client.on('error', onError);
      client.on('close', onClose);

    }, retryTimeout);
  }
}

async function onClose() {
  console.log('Removing all listeners');
  client.removeAllListeners('data');
  client.removeAllListeners('error');
}

async function create(host, port) {
  const c = net.createConnection({
    host: host,
    port: port
  }, () => {
    console.log('connected');
  });
  return c;
}

const connect = async function (host, port, timeout = 5000) {
  retryTimeout = timeout;
  client = await create(host, port);
  client.on('data', onData);
  client.on('error', onError);
  client.on('close', onClose);
};

export { connect };
