var context = require('../../lib/context.js'),
    _ = require('underscore');

var _tests = {};

var assert = {
    instanceof: function(type, obj, error) {
        if(!(obj instanceof type)) throw (error ? error : 'Object') + ' not instanceof, expected ' + typeof type + ' actual ' + typeof obj;
    },
    equal: function(expected, obj, error) {
        if(!(expected === obj)) throw (error ? error : 'Object') + ' not equal, expected ' + expected + ' actual ' + obj;
    },
    equivalent: function(expected, obj, error) {
        if(!(_.isEqual(expected, obj))) throw (error ? error : 'Object') + ' not equivalent, expected ' + JSON.stringify(expected) + ' actual ' + JSON.stringify(obj);
    },
    defined: function(obj, error) {
        if(!obj) throw (error ? error : 'Object') + ' was undefined, expected defined';
    },
    true: function(obj, error) {
        if(!obj) throw (error ? error : 'Object') + ' was false, expected true';
    },
    false: function(obj, error) {
        if(obj) throw (error ? error : 'Object') + ' was true, expected false';
    }
}

var await = {
    throw: function(test, ex, error) {
        test.expect_exception = ex;
        test.failed_exception_error = (error ? error : 'Action') + ' did not throw "' + ex + '"';
    }
}

_tests.construct_with_new = function() {
    // Arrange

    // Act
    var subject = new context();

    // Assert
    assert.instanceof(context, subject);
};

_tests.construct_without_new = function() {
    // Arrange

    // Act
    var subject = context();

    // Assert
    assert.instanceof(context, subject);
};

_tests.create_payload = function() {
    // Arrange
    var payload = { test: '123456' };
    var createpayloadcalled = 0;
    var createpayload = function() { createpayloadcalled++; return payload; };
    // Act
    var subject = new context(createpayload);

    // Assert
    assert.equal(1, createpayloadcalled);
    assert.equal(payload, subject._root._payload);
};

_tests.enter_adds_child = function() {
    // Arrange
    var subject = new context();

    // Act
    subject.enter();

    // Assert
    assert.equal(1, subject._root._children.length);
    assert.defined(subject._root._children[0]);
};

_tests.enter_creates_child_payload = function() {
    // Arrange
    var subject = new context();
    var name = 'testname';
    var payload = 'testpayload';
    var createpayloadcalled = 0;
    var createpayload = function() { createpayloadcalled++; return payload; };

    // Act
    subject.enter(name, createpayload);

    // Assert
    assert.equal(1, createpayloadcalled);
    assert.equal(name, subject._root._children[0]._name)
    assert.equal(payload, subject._root._children[0]._payload)
};

_tests.enter_parent_child_relation = function() {
    // Arrange
    var subject = new context();
    var name = 'testname';

    // Act
    subject.enter(name);

    // Assert
    assert.equal(subject._root, subject._root._children[0]._parent);
};

_tests.construct_current_context_at_root = function() {
    // Arrange
    var rootpayload = 'rootpayload';
    var createpayloadcalled = 0;
    var createpayload = function() { createpayloadcalled++; return rootpayload; };

    // Act
    var subject = new context(createpayload);

    // Assert
    assert.equal(subject._root, subject._current);
    assert.equal(rootpayload, subject._current._payload);
};

_tests.enter_current_context_goes_in = function() {
    // Arrange
    var rootpayload = 'rootpayload';
    var subject = new context(function() { return rootpayload; });
    var childname = 'childname';
    var childpayload = 'childpayload';
    var createchildpayloadcalled = 0;
    var createchildpayload = function() { createchildpayloadcalled++; return childpayload; };

    // Act
    subject.enter(childname, createchildpayload);

    // Assert
    assert.equal(subject._root._children[0], subject._current);
    assert.equal(1, createchildpayloadcalled);
    assert.equal(childname, subject._current._name)
    assert.equal(childpayload, subject._current._payload);
    assert.equal(subject._root, subject._root._children[0]._parent);
};

_tests.enter_current_context_goes_in_multiple = function() {
    // Arrange
    var rootpayload = 'rootpayload';
    var subject = new context(function() { return rootpayload; });
    var child1name = 'child1name';
    var child1payload = 'child1payload';
    subject.enter(child1name, function() { return child1payload; });
    var child2name = 'child2name';
    var child2payload = 'child2payload';
    var createchild2payloadcalled = 0;
    var createchild2payload = function() { createchild2payloadcalled++; return child2payload; };

    // Act
    subject.enter(child2name, createchild2payload);

    // Assert
    assert.equal(subject._root._children[0]._children[0], subject._current);
    assert.equal(1, createchild2payloadcalled);
    assert.equal(child2name, subject._current._name)
    assert.equal(child2payload, subject._current._payload);
    assert.equal(subject._root, subject._root._children[0]._children[0]._parent._parent);
};

_tests.leave_current_context_comes_out = function() {
    // Arrange
    var subject = new context();
    var childname = 'childname';
    subject.enter(childname);

    // Act
    subject.leave();

    // Assert
    assert.equal(subject._root, subject._current);
    assert.equal(subject._root, subject._root._children[0]._parent);
};

_tests.leave_calls_finish = function() {
    // Arrange
    var subject = new context();
    var childname = 'childname';
    var childpayload = 'childpayload';
    var finishcalled = 0;
    var gotpayload = null;
    var finish = function(payload) { finishcalled++; gotpayload = payload; };
    subject.enter(childname, function() { return childpayload; }, finish);

    // Act
    subject.leave();

    // Assert
    assert.equal(1, finishcalled);
    assert.equal(childpayload, gotpayload)
};

_tests.done_calls_finish = function() {
    // Arrange
    var payload = 'payload';
    var finishcalled = 0;
    var gotpayload = null;
    var finish = function(payload) { finishcalled++; gotpayload = payload; };
    var subject = new context(function() { return payload; }, finish);

    // Act
    subject.done();

    // Assert
    assert.equal(1, finishcalled);
    assert.equal(payload, gotpayload)
};

_tests.done_throws_if_not_at_root = function() {
    // Arrange
    var payload = new context();
    payload.enter();

    // Await
    await.throw(_tests.done_throws_if_not_at_root, 'Context error: not at root when "done" called');

    // Act
    payload.done();
};

_tests.exit_pops_out_to_root_and_calls_finish = function() {
    // Arrange
    var finishcalled = 0;
    var finish = function() { finishcalled++; };
    var subject = new context(finish);
    var finish1called = 0;
    var finish1 = function() { finish1called++; };
    subject.enter(null, null, finish1);
    var finish2called = 0;
    var finish2 = function() { finish2called++; };
    subject.enter(null, null, finish2);

    // Act
    subject.exit();

    // Assert
    assert.equal(subject._root, subject._current);
    assert.equal(1, finishcalled, 'Root finish call count');
    assert.equal(1, finish1called, 'First child finish call count');
    assert.equal(1, finish2called, 'Second child finish call count');
};

_tests.is_valid_after_construct = function() {
    // Arrange
    var subject = new context();

    // Act
    var valid = subject.validate();

    // Assert
    assert.true(valid);
};

_tests.is_not_valid_after_enter_without_leave = function() {
    // Arrange
    var subject = new context();
    subject.enter();

    // Act
    var valid = subject.validate();

    // Assert
    assert.false(valid);
};

_tests.is_valid_after_enter_and_leave = function() {
    // Arrange
    var subject = new context();
    subject.enter();
    subject.leave();

    // Act
    var valid = subject.validate();

    // Assert
    assert.true(valid);
};

_tests.objectify_single_root = function() {
    // Arrange
    var subject = new context();

    // Act
    var obj = subject.objectify();

    // Assert
    assert.equivalent({}, obj);
};

_tests.objectify_calls_build = function() {
    // Arrange
    var rootpayload = 'rootpayload';
    var subject = new context(function() { return rootpayload; });
    var gotpayload;
    var buildcalled = 0;
    var build = function(payload) { buildcalled++; gotpayload = payload; };

    // Act
    var obj = subject.objectify(build);

    // Assert
    assert.equivalent({}, obj);
    assert.equal(1, buildcalled);
    assert.equal(rootpayload, gotpayload);
};

_tests.objectify_builds_with_payload = function() {
    // Arrange
    var rootpayload = 'rootpayload';
    var subject = new context(function() { return rootpayload; });
    var build = function(payload) { return { property: payload } };

    // Act
    var obj = subject.objectify(build);

    // Assert
    assert.equivalent({"property":rootpayload}, obj);
};

_tests.objectify_builds_one_child = function() {
    // Arrange
    var rootpayload = 'rootpayload';
    var subject = new context(function() { return rootpayload; });
    var childpayload = 'childpayload';
    subject.enter(null, function() { return childpayload; });
    subject.leave();

    var build = function(payload) { return { property: payload } };

    // Act
    var obj = subject.objectify(build);

    // Assert
    assert.equivalent({property:rootpayload,children:[{property:childpayload}]}, obj);
};

_tests.flatten_builds_one_child = function() {
    // Arrange
    var rootpayload = 'rootpayload';
    var subject = new context(function() { return rootpayload; });
    var childname = 'childname';
    var childpayload = 'childpayload';
    subject.enter(childname, function() { return childpayload; });
    subject.leave();

    var build = function(payload) { return { property: payload } };

    // Act
    var obj = subject.flatten(build);

    // Assert
    assert.equivalent([{name:'/',property:rootpayload},{name:'/'+childname,property:childpayload}], obj);
};

_tests.objectify_builds_multiple_child = function() {
    // Arrange
    var rootpayload = 'rootpayload';
    var subject = new context(function() { return rootpayload; });
    var child1payload = 'child1payload';
    subject.enter(null, function() { return child1payload; });
    subject.leave();
    var child2payload = 'child2payload';
    subject.enter(null, function() { return child2payload; });
    subject.leave();
    var child3payload = 'child3payload';
    subject.enter(null, function() { return child3payload; });
    subject.leave();

    var build = function(payload) { return { property: payload } };

    // Act
    var obj = subject.objectify(build);

    // Assert
    assert.equivalent({property:rootpayload,children:[{property:child1payload},{property:child2payload},{property:child3payload}]}, obj);
};

_tests.objectify_builds_nested_child = function() {
    // Arrange
    var rootpayload = 'rootpayload';
    var subject = new context(function() { return rootpayload; });
    var child1payload = 'child1payload';
    subject.enter(null, function() { return child1payload; });
    var child2payload = 'child2payload';
    subject.enter(null, function() { return child2payload; });
    subject.leave();
    var child3payload = 'child3payload';
    subject.enter(null, function() { return child3payload; });
    subject.leave();
    subject.leave();

    var build = function(payload) { return { property: payload } };

    // Act
    var obj = subject.objectify(build);

    // Assert
    assert.equivalent({property:rootpayload,children:[{property:child1payload,children:[{property:child2payload},{property:child3payload}]}]}, obj);
};

_tests.flatten_builds_nested_child = function() {
    // Arrange
    var rootpayload = 'rootpayload';
    var subject = new context(function() { return rootpayload; });
    var child1payload = 'child1payload';
    subject.enter('child1', function() { return child1payload; });
    var child2payload = 'child2payload';
    subject.enter('child2', function() { return child2payload; });
    subject.leave();
    var child3payload = 'child3payload';
    subject.enter('child3', function() { return child3payload; });
    subject.leave();
    subject.leave();

    var build = function(payload) { return { property: payload } };

    // Act
    var obj = subject.flatten(build);

    // Assert
    assert.equivalent([{name:'/',property:rootpayload},{name:'/child1',property:child1payload},{name:'/child1/child2',property:child2payload},{name:'/child1/child3',property:child3payload}], obj);
};

_tests.objectify_throws_if_not_at_root = function() {
    // Arrange
    var payload = new context();
    payload.enter();

    // Await
    await.throw(_tests.objectify_throws_if_not_at_root, 'Context error: not at root when "objectify" called');

    // Act
    payload.objectify();
};

_tests.flatten_throws_if_not_at_root = function() {
    // Arrange
    var payload = new context();
    payload.enter();

    // Await
    await.throw(_tests.flatten_throws_if_not_at_root, 'Context error: not at root when "flatten" called');

    // Act
    payload.flatten();
};

_tests.leave_throws_at_root = function() {
    // Arrange
    var payload = new context();

    // Await
    await.throw(_tests.leave_throws_at_root, 'Context error: cannot "leave" from root, you might want "done"');

    // Act
    payload.leave();
};

_tests.objectify_builds_with_name = function() {
    // Arrange
    var subject = new context();
    var childname = 'childname';
    subject.enter(childname);
    subject.exit();

    // Act
    var obj = subject.objectify();

    // Assert
    assert.equivalent({"children":[{"name":childname}]}, obj);
};

_tests.objectify_create_enter_done = function() {
    // Arrange
    var subject = new context(function() { return { create: "create" }; }, function(payload) { payload.finish = "finish" });
    subject.done();
    var build = function(payload) { return { one: payload.create, two: payload.finish }; };

    // Act
    var obj = subject.objectify(build);

    // Assert
    assert.equivalent({one:"create",two:"finish"}, obj);
};

_tests.leave_returns_payload = function() {
    // Arrange
    var subject = new context();
    subject.enter(null, function() { return "payload"; });

    // Act
    var payload = subject.leave();

    // Assert
    assert.equal("payload", payload);
};

_tests.done_returns_payload = function() {
    // Arrange
    var subject = new context(function() { return "payload"; });

    // Act
    var payload = subject.done();

    // Assert
    assert.equal("payload", payload);
};

_tests.exit_returns_payload = function() {
    // Arrange
    var subject = new context(function() { return "payload"; });
    subject.enter();

    // Act
    var payload = subject.exit();

    // Assert
    assert.equal("payload", payload);
};

_tests.leave_throws_if_name_incorrect = function() {
    // Arrange
    var subject = new context();
    var child1 = "child1";
    var notchild1 = "not the same value"
    subject.enter("child1");

    // Await
    await.throw(_tests.leave_throws_if_name_incorrect, 'Context error: tried to leave "' + notchild1 + '" but current context is "' + child1 + '"');

    // Act
    subject.leave(notchild1);
};

_tests.leave_does_not_throw_if_name_not_specified = function() {
    // Arrange
    var subject = new context();
    subject.enter("child1");

    // Act
    subject.leave();
};

_tests.log_exceptions = function() {
    // Arrange
    var loggercalled = 0;
    subject = new context(null, null, function(ex) { loggercalled++; } );
    subject.enter("a");

    // Act
    try {
        subject.leave("b");
    }
    catch(ex){}

    // Assert
    assert.equal(1, loggercalled);
};

(function() {
    var testcount = _.keys(_tests).length;
    var errorcount = 0;
    for(var test in _tests) {
        try {
            _tests[test]();
            if(_tests[test].expect_exception) {
                errorcount++;
                console.error('%s failed - %s', test, _tests[test].failed_exception_error);
            }
            else {
                console.log('%s succeeded', test);
            }
        }
        catch(ex) {
            if(_tests[test].expect_exception === ex) {
                console.log('%s succeeded', test);
            }
            else {
                errorcount++;
                console.error('%s failed - %s', test, ex);
            }
        }
    }
    console.info('%s - %d error%s for %d test%s', errorcount == 0 ? 'Success' : 'Fail', errorcount, errorcount == 1 ? '' : 's', testcount, testcount == 1 ? '' : 's');
})();
