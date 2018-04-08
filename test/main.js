/* eslint-env node, mocha */

const assert = require('assert');
const Space = require('../lib/Space');
const { subscribe, spaceToObj, isSpace } = Space;

describe('Space', function() {
  beforeEach(function() {
    this.initialState = {
      searchTerm: 'baggins',
      limit: 5,
      characters: [
        {
          name: 'Bilbo Baggins',
          species: 'Hobbit',
          evil: false,
          books: ['The Hobbit', 'Fellowship of the Ring'],
        },
        {
          name: 'Frodo Baggins',
          species: 'Hobbit',
          evil: false,
          books: [
            'Fellowship of the Ring',
            'The Two Towers',
            'The Return of the King',
          ],
        },
      ],
    };
    this.space = new Space(this.initialState);

    this.numCalls = 0;
    this.newSpace = null;
    this.oldSpace = null;
    this.causedBy = null;
    subscribe(this.space, ({ newSpace, oldSpace, causedBy }) => {
      this.numCalls++;
      this.newSpace = newSpace;
      this.oldSpace = oldSpace;
      this.causedBy = causedBy;
    });
  });

  it('is a function AND a space', function() {
    assert.strictEqual(typeof this.space, 'function');
    assert(isSpace(this.space));
  });

  it('provides expected enumerated keys', function() {
    assert.deepEqual(Object.keys(this.space), [
      'searchTerm',
      'limit',
      'characters',
    ]);
  });

  it('provides expected state', function() {
    assert.deepEqual(spaceToObj(this.space), this.initialState);
  });

  it('stringifies', function() {
    assert.equal(JSON.stringify(this.space), JSON.stringify(this.initialState));
    assert.equal(this.space.toString(), JSON.stringify(this.initialState));
  });

  describe('function updating', function() {
    describe('key setter', function() {
      it('updates single keys with a value', function() {
        var space = this.space;
        assert.strictEqual(typeof space('limit'), 'function');
        space('limit')(6);
        // existing space doesn't change
        assert.strictEqual(space, this.space);
        // correct values given to subscribers
        assert.notStrictEqual(this.newSpace, space);
        assert.strictEqual(this.newSpace.limit, 6);
        assert.strictEqual(this.oldSpace, space);
        assert.strictEqual(this.causedBy, '#set:limit');
      });

      it('adds single keys with a value', function() {
        var space = this.space;
        assert.strictEqual(space.newVal, undefined);
        space('newVal')(true);
        // existing space doesn't change
        assert.strictEqual(space, this.space);
        // correct values given to subscribers
        assert.notStrictEqual(this.newSpace, space);
        assert.strictEqual(this.newSpace.newVal, true);
        assert.strictEqual(this.oldSpace, space);
        assert.strictEqual(this.causedBy, '#set:newVal');
      });
    });

    describe('actions', function() {
      it('updates the space', function() {
        function incLimit({ space }) {
          return { limit: space.limit + 1 };
        }
        var space = this.space;
        space(incLimit)();
        // existing space doesn't change
        assert.strictEqual(space, this.space);
        assert.strictEqual(space.limit, 5);
        // correct values given to subscribers
        assert.notStrictEqual(this.newSpace, space);
        assert.strictEqual(this.newSpace.limit, 6);
        assert.strictEqual(this.oldSpace, space);
        assert.strictEqual(this.causedBy, '#incLimit');

        // Again!
        this.newSpace(incLimit)();
        assert.strictEqual(this.newSpace.limit, 7);
      });

      describe('args', function() {
        it('passes in a value', function() {
          this.space(({ value }) => ({ limit: value }))(10);
          assert.strictEqual(this.newSpace.limit, 10);
        });

        it('passes in multiple values', function() {
          this.space(({ values }) => ({ limit: values[0] + values[1] }))(
            10,
            20
          );
          assert.strictEqual(this.newSpace.limit, 30);
        });

        it('passes in an event if present', function() {
          this.space(({ event }) => ({ searchTerm: event.target.value }))({
            target: { value: '' },
          });
          assert.strictEqual(this.newSpace.searchTerm, '');

          this.space(({ event, value }) => ({ searchTerm: event, val: value }))(
            'cheese'
          );
          assert.strictEqual(this.newSpace.searchTerm, undefined);
          assert.strictEqual(this.newSpace.val, 'cheese');
        });

        it.skip('passes in a merge function', function() {
          this.space(({ merge }) => {
            const newSpace = merge({ limit: 10, searchTerm: '' });
            assert.strictEqual(newSpace.limit, 10);
            assert.strictEqual(newSpace.searchTerm, '');
            return { searchTerm: 'frodo' };
          })();

          assert.strictEqual(this.newSpace.limit, 10);
          assert.strictEqual(this.newSpace.searchTerm, 'frodo');
        });
      });

      describe('action names', function() {
        it('supports actions with no name', function() {
          this.space(({ value }) => ({ limit: value }))(10);
          assert.strictEqual(this.causedBy, '#unknown');
        });

        it('guesses actions names correctly', function() {
          var decLimit = ({ space }) => ({ limit: space.limit - 1 });
          this.space(decLimit)();
          assert.strictEqual(this.causedBy, '#decLimit');
        });

        it('supports explicit action names', function() {
          this.space(({ value }) => ({ limit: value }), 'setLimit')(10);
          assert.strictEqual(this.causedBy, '#setLimit');
        });
      });
    });
  });
});
