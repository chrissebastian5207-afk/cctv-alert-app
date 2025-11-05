setInterval(() => {
  fetch('/ping').then(res => res.json()).then(d => console.log('Ping:', d.time));
}, 15000);
