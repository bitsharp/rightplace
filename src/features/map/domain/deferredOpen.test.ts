import { createDeferredOpen } from './deferredOpen';

describe('createDeferredOpen', () => {
  it('su iOS aspetta che il modal sia sparito: apre solo a onDismiss, una volta sola', () => {
    const open = jest.fn();
    const deferred = createDeferredOpen('ios', open);
    deferred.request('v1');
    expect(open).not.toHaveBeenCalled();
    deferred.onDismiss();
    expect(open).toHaveBeenCalledWith('v1');
    deferred.onDismiss();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('su Android onDismiss non esiste: apre subito', () => {
    const open = jest.fn();
    createDeferredOpen('android', open).request('v1');
    expect(open).toHaveBeenCalledWith('v1');
  });

  it('un onDismiss senza richiesta (chiusura col bottone) non apre nulla', () => {
    const open = jest.fn();
    createDeferredOpen('ios', open).onDismiss();
    expect(open).not.toHaveBeenCalled();
  });

  it('se arrivano due richieste prima del dismiss vale l’ultima', () => {
    const open = jest.fn();
    const deferred = createDeferredOpen('ios', open);
    deferred.request('v1');
    deferred.request('v2');
    deferred.onDismiss();
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('v2');
  });
});
