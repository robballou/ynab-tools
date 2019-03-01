export function delayPromise(delay = 1000): Promise<any> {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}
