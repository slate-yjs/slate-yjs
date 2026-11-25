type InspectableObject = Record<string | number | symbol, unknown>;

function isObject(o: unknown): o is InspectableObject {
  return Object.prototype.toString.call(o) === '[object Object]';
}

export function isPlainObject(o: unknown): o is InspectableObject {
  if (!isObject(o)) {
    return false;
  }

  // If has modified constructor
  const ctor = o.constructor;
  if (ctor === undefined) {
    return true;
  }

  // If has modified prototype
  const prot = ctor.prototype;
  if (isObject(prot) === false) {
    return false;
  }

  // If constructor does not have an Object-specific method
  if (prot.hasOwnProperty('isPrototypeOf') === false) {
    return false;
  }

  // Most likely a plain Object
  return true;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function pick<T extends Object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Pick<T, K> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => keys.includes(key as K))
  ) as Pick<T, K>;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function omit<T extends Object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key as K))
  ) as Omit<T, K>;
}
