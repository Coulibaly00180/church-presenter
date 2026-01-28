export {};

declare global {
  interface Window {
    cp: {
      projection: {
        getState: () => Promise<any>;
        setState: (patch: any) => Promise<any>;
        setContentText: (payload: { title?: string; body: string }) => Promise<any>;
        setMode: (mode: "NORMAL" | "BLACK" | "WHITE") => Promise<any>;
        onState: (cb: (state: any) => void) => () => void;
      };
    };
  }
}
