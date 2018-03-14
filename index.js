// Registered
const registered = {
  callables: {},
  singletons: {},
  instances: {},
};

// Resolved
const resolved = {};

function same(newName, oldName) {
  if (oldName in resolved) {
    resolved[newName] = resolved[oldName];
  }
  if (oldName in registered.callables) {
    registered.callables[newName] = registered.callables[oldName];
  }
  if (oldName in registered.singletons) {
    registered.singletons[newName] = registered.singletons[oldName];
  }
  if (oldName in registered.instances) {
    registered.instances[newName] = registered.instances[oldName];
  }
}

function singleton(name, dependencies, classType) {
  if (! classType) {
    throw new Error(`You are trying to register an undefined singleton: ${name}`);
  }
  registered.singletons[name] = {
    dependencies,
    classType,
  };
}

function callable(name, dependencies, func) {
  if (typeof func !== 'function') {
    throw new Error(`You are trying to register a non callable: ${name}`);
  }
  registered.callables[name] = {
    dependencies,
    func,
  };
}

function instance(name, dependencies, classType) {
  if (! classType) {
    throw new Error(`You are trying to register an undefined instance: ${name}`);
  }
  registered.instances[name] = {
    dependencies,
    classType,
  };
}

function value(name, value) {
  resolved[name] = value;
}

function resolveDependencies(dependencies, callers = []) {
  const resolvePromises = [];
  for (let dependency of dependencies) {
    // Circular dependency error
    if (callers.indexOf(dependency) > -1) {
      throw new Error(`Circular dependency error ${dependency}`);
    }

    resolvePromises.push(resolve(dependency, callers));
  }
  return Promise.all(resolvePromises);
}

function resolveCallable(name, callers) {
  const callable = registered.callables[name];

  return resolveDependencies(callable.dependencies, [...callers, name])
    .then((args) => {
      return callable.func.call(callable.func, ...args);
    });
}

function resolveClassInstance(name, callers) {
  const instance = registered.singletons[name];

  return resolveDependencies(instance.dependencies, [...callers, name])
    .then((args) => {
      return new instance.classType(...args);
    });
}

function resolve(name, callers = []) {
  try {
    // @TODO add maximum call stack handling
    if (!(name in resolved)) {

      if (name in registered.callables) {
        resolved[name] = resolveCallable(name, callers);
      }

      else if (name in registered.singletons) {
        // Resolve and save so we use the same instance again
        resolved[name] = resolveClassInstance(name, callers);
      }

      else if (name in registered.instances) {
        // Don't save because every time we will create a new instance
        return resolveClassInstance(name, callers);
      }

      else {
        throw new Error(`Can't resolve ${name}: Not Registered`);
      }
    }

    return Promise.resolve(resolved[name]);
  } catch(err) {
    return Promise.reject(err);
  }
}

module.exports = {
  same,
  singleton,
  callable,
  instance,
  value,
  resolveDependencies,
  resolveCallable,
  resolveClassInstance,
  resolve,
};
