self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open("game").then(cache=>{
      return cache.addAll(["/"]);
    })
  );
});
