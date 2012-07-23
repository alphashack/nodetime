var context = function(create, finish, logger) {
    if(!(this instanceof context)) return new context(create, finish, logger);

    this._root = new node(null, null, create, finish, logger);
    this._logger = logger;
    this._current = this._root;
};

var node = function(name, parent, create, finish, logger) {
    if(!(this instanceof node)) return new node(name, parent, create, finish, logger);

    this._name = name;
    this._parent = parent;
    this._payload = create ? create() : null;
    this._finish = finish;
    this._logger = logger;
    this._children = [];
}

node.prototype = {
    _logAndThrow: function(ex) {
        if(this._logger) {
            this._logger(ex);
        }
        throw ex;
    },
    finish: function(name) {
        if(name && this._name != name) this._logAndThrow('Context error: tried to leave "' + name + '" but current context is "' + this._name + '"');
        if(this._finish) this._finish(this._payload);
    },
    build: function(build) {
        var obj;
        if(build) obj = build(this._payload);
        return obj ? obj : {};
    },
    objectify: function(build, obj) {
        var current = this.build(build);
        if(this._name) current.name = this._name;
        this._children.forEach(function(child) {
            if(!current.children) current.children = [];
            child.objectify(build, current.children);
        });
        if(obj) obj.push(current);
        return current;
    },
    flatten: function(build, obj, path) {
        if(!obj) obj = [];
        if(!path) path = '';
        if(path != '/') path = path + '/';
        var current = this.build(build);
        current.name = path = path + (this._name ? this._name : '');
        obj.push(current);
        this._children.forEach(function(child) {
            child.flatten(build, obj, path);
        });
        return obj;
    }
}

context.prototype = {
    _logAndThrow: function(ex) {
        if(this._logger) {
            this._logger(ex);
        }
        throw ex;
    },
    enter: function(name, create, finish) {
        var newnode = new node(name, this._current, create, finish, this._logger);
        this._current._children.push(newnode);
        this._current = newnode;
    },
    leave: function(name) {
        if(this._current === this._root) this._logAndThrow('Context error: cannot "leave" from root, you might want "done"');
        this._current.finish(name);
        var payload = this._current._payload;
        this._current = this._current._parent;
        return payload;
    },
    done: function() {
        if(this._current != this._root) this._logAndThrow('Context error: not at root when "done" called');
        this._current.finish();
        return this._current._payload;
    },
    exit: function() {
        while(this._current._parent != null) {
            this.leave();
        }
        return this.done();
    },
    validate: function() {
        return this._current === this._root;
    },
    objectify: function(build) {
        if(this._current != this._root) this._logAndThrow('Context error: not at root when "objectify" called');
        return this._current.objectify(build);
    },
    flatten: function(build) {
        if(this._current != this._root) this._logAndThrow('Context error: not at root when "flatten" called');
        return this._current.flatten(build);
    }
}

module.exports = context;
