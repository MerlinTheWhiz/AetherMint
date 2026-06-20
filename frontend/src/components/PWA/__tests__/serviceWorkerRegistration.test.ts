/**
 * @jest-environment jsdom
 */
import {
  __resetServiceWorkerRegistrationForTests,
  applyUpdate,
  registerServiceWorker,
} from '../serviceWorkerRegistration';

type Listener = (event: Event) => void;

interface FakeWorker {
  state: ServiceWorkerState;
  listeners: Record<string, Listener[]>;
  postMessage: jest.Mock;
}

function makeFakeWorker(initialState: ServiceWorkerState = 'installed'): FakeWorker {
  return {
    state: initialState,
    listeners: {},
    postMessage: jest.fn(),
  };
}

function installFakeServiceWorkerApi() {
  const listeners: Record<string, Listener[]> = {};
  const worker = makeFakeWorker('installed');
  const activeWorker = makeFakeWorker('activated');

  const registration = {
    active: activeWorker,
    installing: null,
    waiting: worker,
    scope: '/',
    updateViaCache: 'none',
    addEventListener: jest.fn((event: string, cb: Listener) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    }),
    removeEventListener: jest.fn(),
    dispatchUpdate: (event: string) => {
      (listeners[event] || []).forEach((cb) => cb({} as Event));
    },
  } as unknown as ServiceWorkerRegistration & {
    dispatchUpdate: (event: string) => void;
  };

  const controller = makeFakeWorker('activated');

  const navigatorShim = {
    serviceWorker: {
      controller: controller as unknown as ServiceWorker,
      register: jest.fn().mockResolvedValue(registration),
      addEventListener: jest.fn((event: string, cb: Listener) => {
        navigatorShim._listeners[event] = navigatorShim._listeners[event] || [];
        navigatorShim._listeners[event].push(cb);
      }),
      removeEventListener: jest.fn(),
      _listeners: listeners,
      _fireControllerChange: () => {
        (navigatorShim._listeners['controllerchange'] || []).forEach((cb) => cb({} as Event));
      },
    },
  };

  Object.defineProperty(window.navigator, 'serviceWorker', {
    configurable: true,
    value: navigatorShim.serviceWorker,
  });

  return {
    registration,
    worker,
    fireControllerChange: navigatorShim.serviceWorker._fireControllerChange,
    fireUpdateFound: () => registration.dispatchUpdate('updatefound'),
  };
}

describe('registerServiceWorker', () => {
  beforeEach(() => {
    __resetServiceWorkerRegistrationForTests();
    jest.resetModules();
    // Default env to production for predictable behavior.
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    // Reset the navigator stub so tests don't leak state between runs.
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: undefined,
    });
  });

  it('returns "unsupported" when the API is unavailable', async () => {
    Object.defineProperty(window.navigator, 'serviceWorker', { configurable: true, value: undefined });
    const status = await registerServiceWorker({});
    expect(status).toBe('unsupported');
  });

  it('registers the worker and reports "registered" in production', async () => {
    const api = installFakeServiceWorkerApi();
    const onUpdate = jest.fn();
    const onOfflineReady = jest.fn();

    const status = await registerServiceWorker({ onUpdate, onOfflineReady });

    expect(status).toBe('registered');
    expect(api.registration.addEventListener).toHaveBeenCalledWith('updatefound', expect.any(Function));
    // A waiting worker + a controller => onUpdate was invoked synchronously.
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onOfflineReady).not.toHaveBeenCalled();

    // Controller change => onOfflineReady once.
    api.fireControllerChange();
    expect(onOfflineReady).toHaveBeenCalledTimes(1);
    // Second controller change should not re-fire.
    api.fireControllerChange();
    expect(onOfflineReady).toHaveBeenCalledTimes(1);
  });

  it('calls onError when registration throws', async () => {
    installFakeServiceWorkerApi();
    // Override register to reject.
    (navigator.serviceWorker.register as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const onError = jest.fn();
    const status = await registerServiceWorker({ onError });
    expect(status).toBe('error');
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('applyUpdate posts SKIP_WAITING to the waiting worker', async () => {
    const api = installFakeServiceWorkerApi();
    await registerServiceWorker({});
    const sent = applyUpdate();
    expect(sent).toBe(true);
    expect(api.worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('applyUpdate returns false when no worker is waiting', async () => {
    installFakeServiceWorkerApi();
    // Re-stub with no waiting worker.
    const fakeRegistration = {
      active: makeFakeWorker('activated'),
      installing: null,
      waiting: null,
      scope: '/',
      updateViaCache: 'none',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as unknown as ServiceWorkerRegistration;
    (navigator.serviceWorker.register as jest.Mock).mockResolvedValueOnce(fakeRegistration);
    await registerServiceWorker({});
    expect(applyUpdate()).toBe(false);
  });
});
