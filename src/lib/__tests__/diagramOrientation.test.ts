import { diagramOrientation } from '../diagramOrientation';

it('rétablit le verrou initial après plusieurs rotations', async () => {
  const lock = jest.fn(async (_value: number) => {}), get = jest.fn(async () => 3);
  const session = diagramOrientation({ get, lock }, 3, 5);
  await session.rotate(true); await session.rotate(false); await session.rotate(true); await session.close();
  expect(lock.mock.calls.map(([value]) => value)).toEqual([5, 3, 5, 3]);
  expect(get).toHaveBeenCalledTimes(1);
});
it('rétablit aussi l’orientation lorsque la fermeture intervient pendant la rotation', async () => {
  let finish: () => void = () => {};
  const lock = jest.fn((_value: number) => _value === 5 ? new Promise<void>(resolve => { finish = resolve; }) : Promise.resolve());
  const session = diagramOrientation({ get: async () => 3, lock }, 3, 5);
  const rotating = session.rotate(true);
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  const closing = session.close(); finish(); await rotating; await closing;
  expect(lock.mock.calls.map(([value]) => value)).toEqual([5, 3]);
  await session.rotate(true); expect(lock).toHaveBeenCalledTimes(2);
});
it('ne modifie rien sans rotation et restaure après un refus du système', async () => {
  const lock = jest.fn(async (value: number) => { if (value === 5) throw Error('Unavailable'); });
  const unused = diagramOrientation({ get: async () => 3, lock }, 3, 5);
  await unused.close(); expect(lock).not.toHaveBeenCalled();
  const session = diagramOrientation({ get: async () => 3, lock }, 3, 5);
  await expect(session.rotate(true)).rejects.toThrow('Unavailable');
  await session.close(); expect(lock.mock.calls.map(([value]) => value)).toEqual([5, 3]);
});
