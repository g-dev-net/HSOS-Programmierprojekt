declare module 'jstat' {
  interface Beta {
    sample(alpha: number, beta: number): number;
  }

  interface Normal {
    sample(mean: number, stddev: number): number;
  }

  interface JStat {
    beta: Beta;
    normal: Normal;
  }

  const jStat: JStat;
  export = jStat;
}