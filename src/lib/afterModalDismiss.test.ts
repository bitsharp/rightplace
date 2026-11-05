import { afterModalDismiss } from './afterModalDismiss';

describe('afterModalDismiss', () => {
  it('su iOS aspetta che il modal sia sparito: esegue solo a onDismiss, una volta sola', () => {
    const run = jest.fn();
    const deferred = afterModalDismiss('ios', run);
    deferred.request('v1');
    expect(run).not.toHaveBeenCalled();
    deferred.onDismiss();
    expect(run).toHaveBeenCalledWith('v1');
    deferred.onDismiss();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('su Android onDismiss non esiste: esegue subito', () => {
    const run = jest.fn();
    afterModalDismiss('android', run).request('v1');
    expect(run).toHaveBeenCalledWith('v1');
  });

  it('un onDismiss senza richiesta (chiusura col bottone) non esegue nulla', () => {
    const run = jest.fn();
    afterModalDismiss('ios', run).onDismiss();
    expect(run).not.toHaveBeenCalled();
  });

  it('se arrivano due richieste prima del dismiss vale l’ultima', () => {
    const run = jest.fn();
    const deferred = afterModalDismiss('ios', run);
    deferred.request('v1');
    deferred.request('v2');
    deferred.onDismiss();
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith('v2');
  });

  it('accetta qualunque tipo di valore, anche 0 o stringa vuota', () => {
    const run = jest.fn();
    const deferred = afterModalDismiss<number>('ios', run);
    deferred.request(0);
    deferred.onDismiss();
    expect(run).toHaveBeenCalledWith(0);
  });
});
