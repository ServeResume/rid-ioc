// Registered
if (!global.REGISTERED_IOC) {
  global.REGISTERED_IOC = {
    callables: {},
    singletons: {},
    instances: {},
  };
}

// Resolved
if (!global.RESOLVED_IOC) {
  global.RESOLVED_IOC = {};
}

function same(newName, oldName) {
  if (oldName in global.RESOLVED_IOC) {
    global.RESOLVED_IOC[newName] = global.RESOLVED_IOC[oldName];
  }
  if (oldName in global.REGISTERED_IOC.callables) {
    global.REGISTERED_IOC.callables[newName] = global.REGISTERED_IOC.callables[oldName];
  }
  if (oldName in global.REGISTERED_IOC.singletons) {
    global.REGISTERED_IOC.singletons[newName] = global.REGISTERED_IOC.singletons[oldName];
  }
  if (oldName in global.REGISTERED_IOC.instances) {
    global.REGISTERED_IOC.instances[newName] = global.REGISTERED_IOC.instances[oldName];
  }
}

function singleton(name, dependencies, classType) {
  if (! classType) {
    throw new Error(`You are trying to register an undefined singleton: ${name}`);
  }
  global.REGISTERED_IOC.singletons[name] = {
    dependencies,
    classType,
  };
}

function callable(name, dependencies, func) {
  if (typeof func !== 'function') {
    throw new Error(`You are trying to register a non callable: ${name}`);
  }
  global.REGISTERED_IOC.callables[name] = {
    dependencies,
    func,
  };
}

function instance(name, dependencies, classType) {
  if (! classType) {
    throw new Error(`You are trying to register an undefined instance: ${name}`);
  }
  global.REGISTERED_IOC.instances[name] = {
    dependencies,
    classType,
  };
}

function value(name, value) {
  global.RESOLVED_IOC[name] = value;
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
  const callable = global.REGISTERED_IOC.callables[name];

  return resolveDependencies(callable.dependencies, [...callers, name])
    .then((args) => {
      return callable.func.call(callable.func, ...args);
    });
}

function resolveClassInstance(name, callers) {
  const instance = global.REGISTERED_IOC.singletons[name];

  return resolveDependencies(instance.dependencies, [...callers, name])
    .then((args) => {
      return new instance.classType(...args);
    });
}

function resolve(name, callers = []) {
  try {
    // @TODO add maximum call stack handling
    if (!(name in global.RESOLVED_IOC)) {

      if (name in global.REGISTERED_IOC.callables) {
        global.RESOLVED_IOC[name] = resolveCallable(name, callers);
      }

      else if (name in global.REGISTERED_IOC.singletons) {
        // Resolve and save so we use the same instance again
        global.RESOLVED_IOC[name] = resolveClassInstance(name, callers);
      }

      else if (name in global.REGISTERED_IOC.instances) {
        // Don't save because every time we will create a new instance
        return resolveClassInstance(name, callers);
      }

      else {
        throw new Error(`Can't resolve ${name}: Not Registered`);
      }
    }

    return Promise.resolve(global.RESOLVED_IOC[name]);
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
