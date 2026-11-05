export type AfterModalDismiss<T> = {
  request: (value: T) => void;
  onDismiss: () => void;
};

// On iOS, presenting a native view controller (image picker) or navigating while a Modal is still
// closing is unreliable: it is silently dropped. Wait for the Modal's onDismiss. Android has no
// onDismiss: run right away. Only the latest pending request is kept.
export function afterModalDismiss<T>(os: string, run: (value: T) => void): AfterModalDismiss<T> {
  let pending: { value: T } | null = null;
  return {
    request(value) {
      if (os !== 'ios') return run(value);
      pending = { value };
    },
    onDismiss() {
      if (pending === null) return;
      const { value } = pending;
      pending = null;
      run(value);
    },
  };
}
