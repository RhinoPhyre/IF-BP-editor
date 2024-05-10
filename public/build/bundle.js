
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        const updates = [];
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                // defer updates until all the DOM shuffling is done
                updates.push(() => block.p(child_ctx, dirty));
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        run_all(updates);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const allBuildings = [
        {
            id: 'kiln',
            name: 'Kiln',
            category: 'Basics',
            cost: { stone: 10 },
            inputs: { stone: 2, coal: 0.2 },
            outputs: { bricks: 1 },
            energyInput: 0,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => true
        },
        {
            id: 'ironSmelter',
            name: 'Iron Smelter',
            category: 'Basics',
            cost: { bricks: 10 },
            inputs: { ironOre: 2, coal: 0.2 },
            outputs: { ironPlates: 1 },
            energyInput: 0,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
        },
        {
            id: 'coalPowerPlant',
            name: 'Coal Power Plant',
            category: 'Energy',
            cost: { ironPlates: 15, bricks: 15 },
            inputs: { coal: 0.5 },
            outputs: { coalAsh: 0.1 },
            energyOutput: 16,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
            description: 'Produces 16 energy.'
        },
        {
            id: 'coalMiner',
            name: 'Coal Miner',
            category: 'Basics',
            cost: { ironPlates: 10, bricks: 10 },
            inputs: {},
            outputs: { coal: 1 },
            energyInput: 1,
            rate: 1,
            minable: true,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
        },
        {
            id: 'ironMiner',
            name: 'Iron Miner',
            category: 'Basics',
            cost: { ironPlates: 10, bricks: 10 },
            inputs: {},
            outputs: { ironOre: 1 },
            energyInput: 1,
            rate: 1,
            minable: true,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
        },
        {
            id: 'stoneMiner',
            name: 'Stone Miner',
            category: 'Basics',
            cost: { ironPlates: 10, bricks: 10 },
            inputs: {},
            outputs: { stone: 1 },
            energyInput: 1,
            rate: 1,
            minable: true,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
        },
        {
            id: 'copperMiner',
            name: 'Copper Miner',
            category: 'Basics',
            cost: { ironPlates: 10, bricks: 10 },
            inputs: {},
            outputs: { copperOre: 1 },
            energyInput: 1,
            rate: 1,
            minable: true,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
        },
        {
            id: 'copperSmelter',
            name: 'Copper Smelter',
            category: 'Basics',
            cost: { bricks: 15 },
            inputs: { copperOre: 2, coal: 0.2 },
            outputs: { copperPlates: 1 },
            energyInput: 0,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
        },
        {
            id: 'gearPress',
            name: 'Gear Press',
            category: 'Intermediates',
            cost: { ironPlates: 30, bricks: 25 },
            inputs: { ironPlates: 1 },
            outputs: { gears: 0.5 },
            energyInput: 2,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
        },
        {
            id: 'cableExtruder',
            name: 'Cable Extruder',
            category: 'Intermediates',
            cost: { gears: 20, bricks: 30 },
            inputs: { copperPlates: 1 },
            outputs: { copperCables: 2 },
            energyInput: 2,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
        },
        {
            id: 'researchCenter',
            name: 'Research Center',
            category: 'Progress & Expansion',
            cost: { gears: 35, bricks: 50, copperCables: 50 },
            inputs: {},
            outputs: {},
            energyInput: 4,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            description: 'Makes science from this parcel available for research.',
            unlockConditions: () => false,
        },
        // {
        // 	id: 'beltBus',
        // 	name: 'Belt Bus',
        // 	category: 'Progress & Expansion',
        // 	cost: { expansionPoints: 1 },
        // 	inputs: {},
        // 	outputs: {},
        // 	energyInput: 2,
        // 	rate: 1,
        // 	minable: false,
        // 	productionRateModifier: 0,
        // 	consumptionRateModifier: 0,
        // 	productionModifierSources: {},
        // 	consumptionModifierSources: {},
        // 	unlockConditions: () => get(_research).completed.has("expansionTech"),
        // 	description: 'Move resources between parcels'
        // },
        // {
        // 	id: 'expansionCenter',
        // 	name: 'Expansion Center',
        // 	category: 'Progress & Expansion',
        // 	cost: { ironPlates: 100 },
        // 	// inputs: { redScience: 4, bricks: 10, gears: 10 },
        // 	// outputs: { expansionPoints: 1 },
        // 	inputs: {},
        // 	outputs: {},
        // 	energyInput: 3,
        // 	rate: 1,
        // 	minable: false,
        // 	productionRateModifier: 0,
        // 	consumptionRateModifier: 0,
        // 	productionModifierSources: {},
        // 	consumptionModifierSources: {},
        // 	unlockConditions: () => get(_research).completed.has("expansionTech"),
        // 	description: 'Unlocks the ability to add more parcels.'
        // },
        {
            id: 'steelMill',
            name: 'Steel Mill',
            category: 'Basics',
            cost: { ironPlates: 100, bricks: 400 },
            inputs: { ironPlates: 5 },
            outputs: { steel: 1 },
            energyInput: 3,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'oilWell',
            name: 'Oil Well',
            category: 'Basics',
            cost: { steel: 250, gears: 250, gen1Chip: 75 },
            inputs: {},
            outputs: { oilBarrel: 1 },
            energyInput: 2,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'oilRefinery',
            name: 'Oil Refinery',
            category: 'Basics',
            cost: { steel: 250, gears: 250, gen1Chip: 75 },
            inputs: { oilBarrel: 10 },
            outputs: { petroleumBarrel: 1 },
            energyInput: 3,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'plasticsPlant',
            name: 'Plastics Plant',
            category: 'Intermediates',
            cost: { steel: 500, gears: 500, gen1Chip: 200 },
            inputs: { petroleumBarrel: 1, coal: 0.5 },
            outputs: { plastics: 3 },
            energyInput: 2,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'sulfurPlant',
            name: 'Sulfur Plant',
            category: 'Intermediates',
            cost: { steel: 500, gears: 500, gen1Chip: 200 },
            inputs: { petroleumBarrel: 1 },
            outputs: { sulfur: 2 },
            energyInput: 2,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'remoteConstructionFacility',
            name: 'Construction Hub',
            category: 'Progress & Expansion',
            cost: { gears: 250, gen1Chip: 100 },
            inputs: {},
            outputs: {},
            energyInput: 6,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
            description: 'Allows global use of resources from this parcel. -30% Production Rate. +30% Consumption Rate.'
        },
        {
            id: 'speedBeaconT1',
            name: 'Speed Beacon T1',
            category: 'Beacons',
            cost: { steel: 100, gen2Chip: 100 },
            inputs: {},
            outputs: {},
            energyInput: 3,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
            description: '+2% Production Rate. +2% Consumption Rate.'
        },
        {
            id: 'productivityBeaconT1',
            name: 'Productivity Beacon T1',
            category: 'Beacons',
            cost: { steel: 100, gen2Chip: 100 },
            inputs: {},
            outputs: {},
            energyInput: 3,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
            description: '+1% Production Rate.'
        },
        {
            id: 'speedBeaconT2',
            name: 'Speed Beacon T2',
            category: 'Beacons',
            cost: { steel: 350, gen3Chip: 350 },
            inputs: {},
            outputs: {},
            energyInput: 6,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
            description: '+4% Production Rate. +4% Consumption Rate.'
        },
        {
            id: 'productivityBeaconT2',
            name: 'Productivity Beacon T2',
            category: 'Beacons',
            cost: { steel: 350, gen3Chip: 350 },
            inputs: {},
            outputs: {},
            energyInput: 6,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
            description: '+2% Production Rate.'
        },
        {
            id: 'speedBeaconT3',
            name: 'Speed Beacon T3',
            category: 'Beacons',
            cost: { steel: 1000, gen4Chip: 1000 },
            inputs: {},
            outputs: {},
            energyInput: 9,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
            description: '+8% Production Rate. +8% Consumption Rate.'
        },
        {
            id: 'productivityBeaconT3',
            name: 'Productivity Beacon T3',
            category: 'Beacons',
            cost: { steel: 1000, gen4Chip: 1000 },
            inputs: {},
            outputs: {},
            energyInput: 9,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
            description: '+6% Production Rate.'
        },
        // {
        // 	id: 'blueprintLibrary',
        // 	name: 'Blueprint Library',
        // 	category: 'Progress & Expansion',
        // 	cost: { steel: 500, gears: 1500, gen2Chip: 1000 },
        // 	inputs: {},
        // 	outputs: {},
        // 	energyInput: 6,
        // 	rate: 1,
        // 	minable: false,
        // 	productionRateModifier: 0,
        // 	consumptionRateModifier: 0,
        // 	productionModifierSources: {},
        // 	consumptionModifierSources: {},
        // 	unlockConditions: () => get(_research).completed.has("blueprintTech"),
        // 	description: "Unlocks 'Copy & Paste' in the parcel context menu"
        // },
        // {
        // 	id: 'militaryHQ',
        // 	name: 'Military HQ',
        // 	category: 'Progress & Expansion',
        // 	cost: { ironPlates: 1000, copperCables: 500 },
        // 	inputs: {},
        // 	outputs: {},
        // 	energyInput: 6,
        // 	rate: 1,
        // 	minable: false,
        // 	productionRateModifier: 0,
        // 	consumptionRateModifier: 0,
        // 	productionModifierSources: {},
        // 	consumptionModifierSources: {},
        // 	unlockConditions: () => get(_research).completed.has("militaryTech"),
        // 	description: 'Makes ammunition from this parcel available for Military Operations'
        // },
        // {
        // 	id: 'standardAmmunitionFactory',
        // 	name: 'Ammunition Factory (Standard)',
        // 	category: 'Progress & Expansion',
        // 	cost: { ironPlates: 1000, gears: 500 },
        // 	inputs: { ironPlates: 1, copperPlates: 3 },
        // 	outputs: { standardAmmunition: 5 },
        // 	energyInput: 6,
        // 	rate: 1,
        // 	minable: false,
        // 	productionRateModifier: 0,
        // 	consumptionRateModifier: 0,
        // 	productionModifierSources: {},
        // 	consumptionModifierSources: {},
        // 	unlockConditions: () => get(_research).completed.has("militaryTech"),
        // },
        // {
        // 	id: 'armorPenetratingAmmunitionFactory',
        // 	name: 'Ammunition Factory (Armor Pen)',
        // 	category: 'Progress & Expansion',
        // 	cost: { steel: 1000, gears: 500, gen1Chip: 500 },
        // 	inputs: { standardAmmunition: 25, steel: 1, copperPlates: 2 },
        // 	outputs: { armorPenetratingAmmunition: 5 },
        // 	energyInput: 12,
        // 	rate: 1,
        // 	minable: false,
        // 	productionRateModifier: 0,
        // 	consumptionRateModifier: 0,
        // 	productionModifierSources: {},
        // 	consumptionModifierSources: {},
        // 	unlockConditions: () => get(_research).completed.has("militaryTech2"),
        // },
        // {
        // 	id: 'piercingAmmunitionFactory',
        // 	name: 'Ammunition Factory (Piercing)',
        // 	category: 'Progress & Expansion',
        // 	cost: { steel: 10000, gears: 10000, gen3Chip: 5000 },
        // 	inputs: { armorPenetratingAmmunition: 20, steel: 1, copperPlates: 1 },
        // 	outputs: { piercingAmmunition: 5 },
        // 	energyInput: 18,
        // 	rate: 1,
        // 	minable: false,
        // 	productionRateModifier: 0,
        // 	consumptionRateModifier: 0,
        // 	productionModifierSources: {},
        // 	consumptionModifierSources: {},
        // 	unlockConditions: () => get(_research).completed.has("militaryTech3"),
        // },
        // {
        // 	id: 'trainStation',
        // 	name: 'Train Station',
        // 	category: 'Progress & Expansion',
        // 	cost: { steel: 100, copperCables: 100, gen1Chip: 50 },
        // 	inputs: {},
        // 	outputs: {},
        // 	energyInput: 8,
        // 	rate: 1,
        // 	minable: false,
        // 	productionRateModifier: 0,
        // 	consumptionRateModifier: 0,
        // 	productionModifierSources: {},
        // 	consumptionModifierSources: {},
        // 	unlockConditions: () => get(_research).completed.has("trains"),
        // },
        // {
        // 	id: 'railFactory',
        // 	name: 'Rail Factory',
        // 	category: 'Intermediates',
        // 	cost: { steel: 150, bricks: 150 },
        // 	inputs: { stone: 1, steel: 1 },
        // 	outputs: { rail: 5 },
        // 	energyInput: 4,
        // 	rate: 1,
        // 	minable: false,
        // 	productionRateModifier: 0,
        // 	consumptionRateModifier: 0,
        // 	productionModifierSources: {},
        // 	consumptionModifierSources: {},
        // 	unlockConditions: () => get(_research).completed.has("trains"),
        // },
        // {
        // 	id: 'turretFactory',
        // 	name: 'Turret Factory',
        // 	category: 'Intermediates',
        // 	cost: { steel: 150, bricks: 150 },
        // 	inputs: { gears: 75, steel: 25, bricks: 25 },
        // 	outputs: { turret: 1 },
        // 	energyInput: 6,
        // 	rate: 1,
        // 	minable: false,
        // 	productionRateModifier: 0,
        // 	consumptionRateModifier: 0,
        // 	productionModifierSources: {},
        // 	consumptionModifierSources: {},
        // 	unlockConditions: () => get(_research).completed.has("militaryTech"),
        // },
        // {
        // 	id: 'wallFactory',
        // 	name: 'Wall Factory',
        // 	category: 'Intermediates',
        // 	cost: { steel: 150, bricks: 150 },
        // 	inputs: { ironPlates: 5, bricks: 50 },
        // 	outputs: { wall: 1 },
        // 	energyInput: 6,
        // 	rate: 1,
        // 	minable: false,
        // 	productionRateModifier: 0,
        // 	consumptionRateModifier: 0,
        // 	productionModifierSources: {},
        // 	consumptionModifierSources: {},
        // 	unlockConditions: () => get(_research).completed.has("militaryTech"),
        // },
        {
            id: 'redScienceLab',
            name: 'Red Science Laboratory',
            category: 'Progress & Expansion',
            cost: { gears: 50, bricks: 50 },
            inputs: { copperCables: 5, gears: 2 },
            outputs: { redScience: 1 },
            energyInput: 3,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
        },
        {
            id: 'greenScienceLab',
            name: 'Green Science Laboratory',
            category: 'Progress & Expansion',
            cost: { gen1Chip: 80, steel: 180, bricks: 160 },
            inputs: { copperCables: 12, gen1Chip: 4 },
            outputs: { greenScience: 1 },
            energyInput: 3,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
        },
        // {
        // 	id: 'darkScienceLab',
        // 	name: 'Dark Science Laboratory',
        // 	category: 'Progress & Expansion',
        // 	cost: { gen2Chip: 250, copperCables: 250, gears: 250, bricks: 250 },
        // 	inputs: { standardAmmunition: 80, turret: 1, wall: 3 },
        // 	outputs: { darkScience: 1 },
        // 	energyInput: 3,
        // 	rate: 1,
        // 	minable: false,
        // 	productionRateModifier: 0,
        // 	consumptionRateModifier: 0,
        // 	productionModifierSources: {},
        // 	consumptionModifierSources: {},
        // 	unlockConditions: () => get(parcels).some((parcel) => parcel.buildings.greenScienceLab > 0)
        // },
        {
            id: 'blueScienceLab',
            name: 'Blue Science Laboratory',
            category: 'Progress & Expansion',
            cost: { gen2Chip: 250, steel: 250, bricks: 250 },
            inputs: { sulfur: 8, gen2Chip: 4 },
            outputs: { blueScience: 1 },
            energyInput: 3,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
        },
        {
            id: 'purpleScienceLab',
            name: 'Purple Science Laboratory',
            category: 'Progress & Expansion',
            cost: { gen3Chip: 250, steel: 250, bricks: 250 },
            inputs: { steel: 3, gen3Chip: 2, gen1Chip: 4 },
            outputs: { purpleScience: 1 },
            energyInput: 3,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
        },
        {
            id: 'yellowScienceLab',
            name: 'Yellow Science Laboratory',
            category: 'Progress & Expansion',
            cost: { gen4Chip: 250, steel: 250, bricks: 250 },
            inputs: { gen4Chip: 2, gen2Chip: 4 },
            outputs: { yellowScience: 1 },
            energyInput: 3,
            rate: 1,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            minable: false,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
        },
        {
            id: 'batteryFactory',
            name: 'Battery Factory',
            category: 'Intermediates',
            cost: { steel: 500, bricks: 500, gen1Chip: 500 },
            inputs: { ironPlates: 1, copperPlates: 1, sulfur: 1 },
            outputs: { battery: 1 },
            energyInput: 6,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'solarBatteryArray',
            name: 'Solar & Battery Array',
            category: 'Energy',
            cost: { steel: 100, copperCables: 100, gen1Chip: 50, battery: 50 },
            inputs: {},
            outputs: {},
            energyOutput: 16,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            description: 'Produces 16 energy.',
            unlockConditions: () => false
        },
        {
            id: 'fuelProcessingFacility',
            name: 'Fuel Processing Facility',
            category: 'Intermediates',
            cost: { steel: 5000, bricks: 5000, gen5Chip: 500 },
            inputs: { petroleumBarrel: 10, coal: 10 },
            outputs: { fuelCell: 1 },
            energyInput: 6,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'LDSFactory',
            name: 'LDS Factory',
            category: 'Intermediates',
            cost: { steel: 5000, bricks: 5000, gen5Chip: 500 },
            inputs: { copperPlates: 20, plastics: 5, steel: 2 },
            outputs: { lightDensityStructures: 1 },
            energyInput: 6,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'rocketControlUnitFactory',
            name: 'Rocket Control Unit Factory',
            category: 'Intermediates',
            cost: { steel: 5000, bricks: 5000, gen5Chip: 500 },
            inputs: { gen5Chip: 1, gen4Chip: 5, gen3Chip: 10, gen2Chip: 25, gen1Chip: 50 },
            outputs: { rocketControlUnit: 1 },
            energyInput: 6,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'rocketLaunchPad',
            name: 'Rocket Launch Pad',
            category: 'Progress & Expansion',
            cost: { steel: 5000, bricks: 5000, gen5Chip: 500 },
            inputs: { satelite: 1, rocketParts: 100 },
            outputs: { whiteScience: 1000 },
            energyInput: 16,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'rocketPartAssembly',
            name: 'Rocket Part Assembly',
            category: 'Intermediates',
            cost: { steel: 5000, bricks: 5000, gen5Chip: 500 },
            inputs: { fuelCell: 4, lightDensityStructures: 4, rocketControlUnit: 4 },
            outputs: { rocketParts: 1 },
            energyInput: 20,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'sateliteAssembly',
            name: 'Satelite Assembly',
            category: 'Intermediates',
            cost: { steel: 5000, bricks: 5000, gen5Chip: 500 },
            inputs: {
                copperPlates: 300,
                ironPlates: 180,
                plastics: 300,
                gen5Chip: 100,
                fuelCell: 50,
                steel: 300
            },
            outputs: { satelite: 1 },
            energyInput: 20,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'productionChallengePlant',
            name: 'Production Challenge Plant',
            category: 'Progress & Expansion',
            cost: { steel: 1000, bricks: 250 },
            inputs: {},
            outputs: {},
            energyInput: 12,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'quartzRefinery',
            name: 'Quartz Refinery',
            category: 'Intermediates',
            cost: { steel: 150, bricks: 250 },
            inputs: { stone: 3 },
            outputs: { quartz: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'siliconFurnace',
            name: 'Silicon Furnace',
            category: 'Intermediates',
            cost: { steel: 150, bricks: 250 },
            inputs: { quartz: 1, coal: 0.25 },
            outputs: { silicon: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'bauxiteMiner',
            name: 'Bauxite Miner',
            category: 'Intermediates',
            cost: { steel: 150, bricks: 250 },
            inputs: {},
            outputs: { bauxiteOre: 10 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'aluminiumSmelter',
            name: 'Aluminium Smelter',
            category: 'Intermediates',
            cost: { steel: 250, bricks: 150 },
            inputs: { bauxiteOre: 5, coal: 1 },
            outputs: { aluminium: 0.5 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'gen1ChipPlant',
            name: 'Gen 1 Chip Plant',
            category: 'Intermediates',
            cost: { steel: 350, bricks: 350 },
            inputs: { silicon: 2, copperCables: 3, aluminium: 0.5 },
            outputs: { gen1Chip: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'bioreactor',
            name: 'Bioreactor',
            category: 'Intermediates',
            cost: { steel: 150, bricks: 150, gen1Chip: 50 },
            inputs: {},
            outputs: { oxygen: 0.1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'oxidationFurnace',
            name: 'Oxidation Furnace',
            category: 'Intermediates',
            cost: { steel: 1000, bricks: 1000, gen1Chip: 500 },
            inputs: { silicon: 1, oxygen: 2 },
            outputs: { siliconDioxide: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'gen2ChipPlant',
            name: 'Gen 2 Chip Plant',
            category: 'Intermediates',
            cost: { steel: 500, bricks: 500, gen1Chip: 500 },
            inputs: { siliconDioxide: 1, plastics: 1 },
            outputs: { gen2Chip: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'phenolicResinPlant',
            name: 'Phenolic Resin Plant',
            category: 'Intermediates',
            cost: { steel: 1000, bricks: 1000, gen1Chip: 500 },
            inputs: { petroleumBarrel: 1, coal: 4, coalAsh: 2 },
            outputs: { phenolicResin: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'lowDepositionChamber',
            name: 'Low Deposition Chamber',
            category: 'Intermediates',
            cost: { steel: 1000, bricks: 1000, gen2Chip: 1000 },
            inputs: { silicon: 1, oxygen: 1 },
            outputs: { lowkDielectric: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'germaniumRefinery',
            name: 'Germanium Refinery',
            category: 'Intermediates',
            cost: { steel: 500, bricks: 500, gen2Chip: 250 },
            inputs: { coalAsh: 0.6 },
            outputs: { germanium: 0.1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'alloyFurnace',
            name: 'SiGe Furnace',
            category: 'Intermediates',
            cost: { steel: 500, bricks: 500, gen2Chip: 250 },
            inputs: { silicon: 1, germanium: 1 },
            outputs: { siliconGermanium: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'highGradeSmelter',
            name: 'High-Grade Smelter',
            category: 'Intermediates',
            cost: { steel: 1500, bricks: 1500, gen2Chip: 500 },
            // inputs: { hgCopperOre: 1 },
            inputs: { copperOre: 20, coal: 4 },
            outputs: { hgCopperPlate: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'gen3ChipPlant',
            name: 'Gen 3 Chip Plant',
            category: 'Intermediates',
            cost: { steel: 1500, bricks: 1500, gen2Chip: 1000 },
            inputs: { lowkDielectric: 1, siliconGermanium: 0.5, hgCopperPlate: 0.5, phenolicResin: 1 },
            outputs: { gen3Chip: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'hafniumMine',
            name: 'Hafnium Mine',
            category: 'Intermediates',
            cost: { steel: 500, bricks: 500, gen3Chip: 150 },
            inputs: {},
            outputs: { hafnium: 0.1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'advancedDepositionChamber',
            name: 'Advanced Deposition Chamber',
            category: 'Intermediates',
            cost: { steel: 2500, bricks: 2500, gen3Chip: 1000 },
            inputs: { hafnium: 1, siliconDioxide: 1, silicon: 2 },
            outputs: { highkDielectric: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'metalGatePlant',
            name: 'Metal Gate Plant',
            category: 'Intermediates',
            cost: { steel: 2500, bricks: 2500, gen3Chip: 1000 },
            inputs: { hafnium: 2, silicon: 4 },
            outputs: { metalGate: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'gen4ChipPlant',
            name: 'Gen 4 Chip Plant',
            category: 'Intermediates',
            cost: { steel: 2500, bricks: 2500, gen3Chip: 1000 },
            inputs: { siliconGermanium: 1, highkDielectric: 1, metalGate: 1, phenolicResin: 1 },
            outputs: { gen4Chip: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'grapheneLab',
            name: 'Graphene Lab',
            category: 'Intermediates',
            cost: { steel: 5000, bricks: 5000, gen4Chip: 800 },
            inputs: { silicon: 1, coal: 1, coalAsh: 0.1 },
            outputs: { graphene: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'hafniumDisulfidePlant',
            name: 'Hafnium-Disulfide Plant',
            category: 'Intermediates',
            cost: { steel: 5000, bricks: 5000, gen4Chip: 800 },
            inputs: { hafnium: 1, sulfur: 2 },
            outputs: { hafniumDisulfide: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'nanowireLab',
            name: 'Nanowire Lab',
            category: 'Intermediates',
            cost: { steel: 5000, bricks: 5000, gen4Chip: 800 },
            inputs: { hafnium: 1, siliconGermanium: 1, oxygen: 1 },
            outputs: { nanowires: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'apMateriallLab',
            name: 'AP-Material Lab',
            category: 'Intermediates',
            cost: { steel: 5000, bricks: 5000, gen4Chip: 800 },
            inputs: { hgCopperPlate: 1, phenolicResin: 1, quartz: 1 },
            outputs: { apMaterial: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'gen5ChipPlant',
            name: 'Gen 5 Chip Plant',
            category: 'Intermediates',
            cost: { steel: 150, bricks: 150 },
            inputs: { graphene: 3, hafniumDisulfide: 2, nanowires: 2, apMaterial: 2 },
            outputs: { gen5Chip: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'droneFactory',
            name: 'Drone Factory',
            category: 'Intermediates',
            cost: { steel: 150, bricks: 150 },
            inputs: { gen2Chip: 1, gen1Chip: 1, gears: 2, copperCables: 8 },
            outputs: { drone: 1 },
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false
        },
        {
            id: 'dronePort',
            name: 'Drone Port',
            category: 'Progress & Expansion',
            cost: { steel: 1500, bricks: 1500, drone: 100 },
            inputs: {},
            outputs: {},
            energyInput: 8,
            rate: 1,
            minable: false,
            productionRateModifier: 0,
            consumptionRateModifier: 0,
            productionModifierSources: {},
            consumptionModifierSources: {},
            unlockConditions: () => false,
            description: 'Increases Task Execution Speed by +2 Tasks / Minute.'
        }
    ];

    /* src\components\CollapsibleSection.svelte generated by Svelte v3.59.2 */

    const file$1 = "src\\components\\CollapsibleSection.svelte";

    function create_fragment$2(ctx) {
    	let div1;
    	let h3;
    	let button;
    	let t0;
    	let t1;
    	let t2;
    	let div0;
    	let div0_hidden_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h3 = element("h3");
    			button = element("button");
    			t0 = text("+ ");
    			t1 = text(/*headerText*/ ctx[0]);
    			t2 = space();
    			div0 = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(button, "aria-expanded", /*expanded*/ ctx[1]);
    			attr_dev(button, "class", "svelte-yi6l3u");
    			add_location(button, file$1, 10, 8, 266);
    			attr_dev(h3, "class", "svelte-yi6l3u");
    			add_location(h3, file$1, 9, 4, 252);
    			attr_dev(div0, "class", "contents");
    			div0.hidden = div0_hidden_value = !/*expanded*/ ctx[1];
    			add_location(div0, file$1, 14, 4, 394);
    			attr_dev(div1, "class", "collapsible svelte-yi6l3u");
    			add_location(div1, file$1, 8, 0, 221);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h3);
    			append_dev(h3, button);
    			append_dev(button, t0);
    			append_dev(button, t1);
    			append_dev(div1, t2);
    			append_dev(div1, div0);

    			if (default_slot) {
    				default_slot.m(div0, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[4], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*headerText*/ 1) set_data_dev(t1, /*headerText*/ ctx[0]);

    			if (!current || dirty & /*expanded*/ 2) {
    				attr_dev(button, "aria-expanded", /*expanded*/ ctx[1]);
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[2],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*expanded*/ 2 && div0_hidden_value !== (div0_hidden_value = !/*expanded*/ ctx[1])) {
    				prop_dev(div0, "hidden", div0_hidden_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CollapsibleSection', slots, ['default']);
    	let { headerText } = $$props;
    	let expanded = false;

    	$$self.$$.on_mount.push(function () {
    		if (headerText === undefined && !('headerText' in $$props || $$self.$$.bound[$$self.$$.props['headerText']])) {
    			console.warn("<CollapsibleSection> was created without expected prop 'headerText'");
    		}
    	});

    	const writable_props = ['headerText'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CollapsibleSection> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(1, expanded = !expanded);

    	$$self.$$set = $$props => {
    		if ('headerText' in $$props) $$invalidate(0, headerText = $$props.headerText);
    		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ headerText, expanded });

    	$$self.$inject_state = $$props => {
    		if ('headerText' in $$props) $$invalidate(0, headerText = $$props.headerText);
    		if ('expanded' in $$props) $$invalidate(1, expanded = $$props.expanded);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [headerText, expanded, $$scope, slots, click_handler];
    }

    class CollapsibleSection extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { headerText: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CollapsibleSection",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get headerText() {
    		throw new Error("<CollapsibleSection>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set headerText(value) {
    		throw new Error("<CollapsibleSection>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\BlobReader.svelte generated by Svelte v3.59.2 */

    const { Object: Object_1, console: console_1 } = globals;
    const file = "src\\components\\BlobReader.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	child_ctx[25] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	child_ctx[27] = list;
    	child_ctx[25] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i][0];
    	child_ctx[29] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i][0];
    	child_ctx[32] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[35] = list[i];
    	return child_ctx;
    }

    // (123:0) {#if jsonDOM}
    function create_if_block(ctx) {
    	let iframe;
    	let t0;
    	let h10;
    	let t2;
    	let each_blocks_1 = [];
    	let each0_lookup = new Map();
    	let t3;
    	let h11;
    	let t5;
    	let each_blocks = [];
    	let each1_lookup = new Map();
    	let t6;
    	let br0;
    	let br1;
    	let t7;
    	let collapsiblesection;
    	let current;
    	let each_value_1 = /*parcelDOM*/ ctx[4];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*parcel*/ ctx[26].id;
    	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
    	}

    	let each_value = /*connectionDOM*/ ctx[3].filter(func_2);
    	validate_each_argument(each_value);
    	const get_key_1 = ctx => /*connection*/ ctx[23].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key_1);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key_1(child_ctx);
    		each1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	collapsiblesection = new CollapsibleSection({
    			props: {
    				headerText: "Full JSON",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			iframe = element("iframe");
    			t0 = space();
    			h10 = element("h1");
    			h10.textContent = "Parcels";
    			t2 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t3 = space();
    			h11 = element("h1");
    			h11.textContent = "Connections";
    			t5 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			br0 = element("br");
    			br1 = element("br");
    			t7 = space();
    			create_component(collapsiblesection.$$.fragment);
    			attr_dev(iframe, "id", "my_iframe");
    			set_style(iframe, "display", "none");
    			add_location(iframe, file, 123, 4, 3736);
    			add_location(h10, file, 124, 4, 3796);
    			add_location(h11, file, 154, 4, 5532);
    			add_location(br0, file, 165, 4, 6114);
    			add_location(br1, file, 165, 10, 6120);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, iframe, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, h10, anchor);
    			insert_dev(target, t2, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, t3, anchor);
    			insert_dev(target, h11, anchor);
    			insert_dev(target, t5, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, t6, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t7, anchor);
    			mount_component(collapsiblesection, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*parcelDOM, removeOutput, removeBuilding, incBuilding, decBuilding, newBuilding, addBuilding*/ 31824) {
    				each_value_1 = /*parcelDOM*/ ctx[4];
    				validate_each_argument(each_value_1);
    				group_outros();
    				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, t3.parentNode, outro_and_destroy_block, create_each_block_1, t3, get_each_context_1);
    				check_outros();
    			}

    			if (dirty[0] & /*connectionDOM, removeConnection*/ 32776) {
    				each_value = /*connectionDOM*/ ctx[3].filter(func_2);
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key_1);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each1_lookup, t6.parentNode, outro_and_destroy_block, create_each_block, t6, get_each_context);
    				check_outros();
    			}

    			const collapsiblesection_changes = {};

    			if (dirty[0] & /*decBlob*/ 2 | dirty[1] & /*$$scope*/ 128) {
    				collapsiblesection_changes.$$scope = { dirty, ctx };
    			}

    			collapsiblesection.$set(collapsiblesection_changes);
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(collapsiblesection.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(collapsiblesection.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(iframe);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(h10);
    			if (detaching) detach_dev(t2);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d(detaching);
    			}

    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(h11);
    			if (detaching) detach_dev(t5);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t7);
    			destroy_component(collapsiblesection, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(123:0) {#if jsonDOM}",
    		ctx
    	});

    	return block;
    }

    // (132:16) {#each allBuildings as building}
    function create_each_block_4(ctx) {
    	let option;
    	let t_value = /*building*/ ctx[35].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*building*/ ctx[35].id;
    			option.value = option.__value;
    			set_style(option, "background-image", "url(icons/" + /*building*/ ctx[35].id + "-48.png)");
    			add_location(option, file, 132, 20, 4357);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(132:16) {#each allBuildings as building}",
    		ctx
    	});

    	return block;
    }

    // (136:12) {#each Object.entries(parcel.buildings) as [name, qty]}
    function create_each_block_3(ctx) {
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t4;
    	let t5_value = allBuildings.filter(func_1)[0].name + "";
    	let t5;
    	let t6;
    	let t7_value = /*qty*/ ctx[32] + "";
    	let t7;
    	let t8;
    	let button2;
    	let t10;
    	let br;
    	let mounted;
    	let dispose;

    	function func(...args) {
    		return /*func*/ ctx[19](/*name*/ ctx[28], ...args);
    	}

    	function func_1(...args) {
    		return /*func_1*/ ctx[20](/*name*/ ctx[28], ...args);
    	}

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "-";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "+";
    			t3 = space();
    			img = element("img");
    			t4 = space();
    			t5 = text(t5_value);
    			t6 = text(": ");
    			t7 = text(t7_value);
    			t8 = space();
    			button2 = element("button");
    			button2.textContent = "Remove";
    			t10 = space();
    			br = element("br");
    			attr_dev(button0, "class", "btn btn__primary");
    			add_location(button0, file, 136, 16, 4606);
    			attr_dev(button1, "class", "btn btn__primary");
    			add_location(button1, file, 137, 16, 4704);
    			if (!src_url_equal(img.src, img_src_value = "icons/" + /*name*/ ctx[28] + "-48.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = allBuildings.filter(func)[0].name);
    			attr_dev(img, "height", "24");
    			attr_dev(img, "width", "24");
    			add_location(img, file, 138, 16, 4802);
    			attr_dev(button2, "class", "btn btn__danger");
    			add_location(button2, file, 140, 16, 5003);
    			add_location(br, file, 141, 16, 5108);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, img, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, button2, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, br, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						button0,
    						"click",
    						function () {
    							if (is_function(/*decBuilding*/ ctx[11](/*parcel*/ ctx[26], /*name*/ ctx[28]))) /*decBuilding*/ ctx[11](/*parcel*/ ctx[26], /*name*/ ctx[28]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						button1,
    						"click",
    						function () {
    							if (is_function(/*incBuilding*/ ctx[10](/*parcel*/ ctx[26], /*name*/ ctx[28]))) /*incBuilding*/ ctx[10](/*parcel*/ ctx[26], /*name*/ ctx[28]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						button2,
    						"click",
    						function () {
    							if (is_function(/*removeBuilding*/ ctx[12](/*parcel*/ ctx[26], /*name*/ ctx[28]))) /*removeBuilding*/ ctx[12](/*parcel*/ ctx[26], /*name*/ ctx[28]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*parcelDOM*/ 16 && !src_url_equal(img.src, img_src_value = "icons/" + /*name*/ ctx[28] + "-48.png")) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*parcelDOM*/ 16 && img_alt_value !== (img_alt_value = allBuildings.filter(func)[0].name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty[0] & /*parcelDOM*/ 16 && t5_value !== (t5_value = allBuildings.filter(func_1)[0].name + "")) set_data_dev(t5, t5_value);
    			if (dirty[0] & /*parcelDOM*/ 16 && t7_value !== (t7_value = /*qty*/ ctx[32] + "")) set_data_dev(t7, t7_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(img);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(button2);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(br);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(136:12) {#each Object.entries(parcel.buildings) as [name, qty]}",
    		ctx
    	});

    	return block;
    }

    // (148:12) {:else}
    function create_else_block(ctx) {
    	let t;
    	let br;

    	const block = {
    		c: function create() {
    			t = text("None");
    			br = element("br");
    			add_location(br, file, 148, 20, 5423);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(148:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (145:12) {#each Object.entries(parcel.outputValues) as [name, type]}
    function create_each_block_2(ctx) {
    	let t0_value = /*name*/ ctx[28] + "";
    	let t0;
    	let t1;
    	let t2_value = /*type*/ ctx[29].unloader + "";
    	let t2;
    	let t3;
    	let button;
    	let br;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = text(": ");
    			t2 = text(t2_value);
    			t3 = space();
    			button = element("button");
    			button.textContent = "Remove";
    			br = element("br");
    			attr_dev(button, "class", "btn btn__danger");
    			add_location(button, file, 146, 16, 5291);
    			add_location(br, file, 146, 101, 5376);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, button, anchor);
    			insert_dev(target, br, anchor);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*removeOutput*/ ctx[13](/*parcel*/ ctx[26], /*name*/ ctx[28]))) /*removeOutput*/ ctx[13](/*parcel*/ ctx[26], /*name*/ ctx[28]).apply(this, arguments);
    					},
    					false,
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*parcelDOM*/ 16 && t0_value !== (t0_value = /*name*/ ctx[28] + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*parcelDOM*/ 16 && t2_value !== (t2_value = /*type*/ ctx[29].unloader + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(br);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(145:12) {#each Object.entries(parcel.outputValues) as [name, type]}",
    		ctx
    	});

    	return block;
    }

    // (127:4) <CollapsibleSection headerText='{parcel.id} ({parcel.parcelType}) - Max Buildings: {totalBuildings(parcel)}/{parcel.maxBuildings}' >
    function create_default_slot_2(ctx) {
    	let div;
    	let t0;
    	let button;
    	let t2;
    	let select;
    	let option;
    	let br0;
    	let t4;
    	let t5;
    	let br1;
    	let t6;
    	let t7;
    	let br2;
    	let mounted;
    	let dispose;
    	let each_value_4 = allBuildings;
    	validate_each_argument(each_value_4);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_2[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	function select_change_handler() {
    		/*select_change_handler*/ ctx[18].call(select, /*parcel*/ ctx[26]);
    	}

    	let each_value_3 = Object.entries(/*parcel*/ ctx[26].buildings);
    	validate_each_argument(each_value_3);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_1[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = Object.entries(/*parcel*/ ctx[26].outputValues);
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each2_else = null;

    	if (!each_value_2.length) {
    		each2_else = create_else_block(ctx);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("Buildings:");
    			button = element("button");
    			button.textContent = "Add";
    			t2 = space();
    			select = element("select");
    			option = element("option");
    			option.textContent = "Choose Building...";

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			br0 = element("br");
    			t4 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t5 = text("\r\n            Outputs:");
    			br1 = element("br");
    			t6 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (each2_else) {
    				each2_else.c();
    			}

    			t7 = space();
    			br2 = element("br");
    			attr_dev(button, "class", "btn btn__primary");
    			add_location(button, file, 128, 22, 4057);
    			option.__value = "";
    			option.value = option.__value;
    			add_location(option, file, 130, 16, 4241);
    			attr_dev(select, "name", "newBuilding");
    			if (/*newBuilding*/ ctx[6][/*parcel*/ ctx[26].id] === void 0) add_render_callback(select_change_handler);
    			add_location(select, file, 129, 12, 4160);
    			add_location(br0, file, 134, 21, 4515);
    			add_location(br1, file, 143, 20, 5155);
    			add_location(br2, file, 150, 12, 5462);
    			attr_dev(div, "class", "content");
    			add_location(div, file, 127, 8, 4012);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, button);
    			append_dev(div, t2);
    			append_dev(div, select);
    			append_dev(select, option);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(select, null);
    				}
    			}

    			select_option(select, /*newBuilding*/ ctx[6][/*parcel*/ ctx[26].id], true);
    			append_dev(div, br0);
    			append_dev(div, t4);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(div, null);
    				}
    			}

    			append_dev(div, t5);
    			append_dev(div, br1);
    			append_dev(div, t6);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div, null);
    				}
    			}

    			if (each2_else) {
    				each2_else.m(div, null);
    			}

    			append_dev(div, t7);
    			append_dev(div, br2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						button,
    						"click",
    						function () {
    							if (is_function(/*addBuilding*/ ctx[14](/*parcel*/ ctx[26], /*newBuilding*/ ctx[6]))) /*addBuilding*/ ctx[14](/*parcel*/ ctx[26], /*newBuilding*/ ctx[6]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(select, "change", select_change_handler)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*allBuildings*/ 0) {
    				each_value_4 = allBuildings;
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_4(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_4.length;
    			}

    			if (dirty[0] & /*newBuilding, parcelDOM*/ 80) {
    				select_option(select, /*newBuilding*/ ctx[6][/*parcel*/ ctx[26].id]);
    			}

    			if (dirty[0] & /*removeBuilding, parcelDOM, incBuilding, decBuilding*/ 7184) {
    				each_value_3 = Object.entries(/*parcel*/ ctx[26].buildings);
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_3(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div, t5);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_3.length;
    			}

    			if (dirty[0] & /*removeOutput, parcelDOM*/ 8208) {
    				each_value_2 = Object.entries(/*parcel*/ ctx[26].outputValues);
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t7);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;

    				if (!each_value_2.length && each2_else) {
    					each2_else.p(ctx, dirty);
    				} else if (!each_value_2.length) {
    					each2_else = create_else_block(ctx);
    					each2_else.c();
    					each2_else.m(div, t7);
    				} else if (each2_else) {
    					each2_else.d(1);
    					each2_else = null;
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (each2_else) each2_else.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(127:4) <CollapsibleSection headerText='{parcel.id} ({parcel.parcelType}) - Max Buildings: {totalBuildings(parcel)}/{parcel.maxBuildings}' >",
    		ctx
    	});

    	return block;
    }

    // (126:4) {#each parcelDOM as parcel, index (parcel.id)}
    function create_each_block_1(key_1, ctx) {
    	let first;
    	let collapsiblesection;
    	let current;

    	collapsiblesection = new CollapsibleSection({
    			props: {
    				headerText: "" + (/*parcel*/ ctx[26].id + " (" + /*parcel*/ ctx[26].parcelType + ") - Max Buildings: " + totalBuildings(/*parcel*/ ctx[26]) + "/" + /*parcel*/ ctx[26].maxBuildings),
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(collapsiblesection.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(collapsiblesection, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const collapsiblesection_changes = {};
    			if (dirty[0] & /*parcelDOM*/ 16) collapsiblesection_changes.headerText = "" + (/*parcel*/ ctx[26].id + " (" + /*parcel*/ ctx[26].parcelType + ") - Max Buildings: " + totalBuildings(/*parcel*/ ctx[26]) + "/" + /*parcel*/ ctx[26].maxBuildings);

    			if (dirty[0] & /*parcelDOM, newBuilding*/ 80 | dirty[1] & /*$$scope*/ 128) {
    				collapsiblesection_changes.$$scope = { dirty, ctx };
    			}

    			collapsiblesection.$set(collapsiblesection_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(collapsiblesection.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(collapsiblesection.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(collapsiblesection, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(126:4) {#each parcelDOM as parcel, index (parcel.id)}",
    		ctx
    	});

    	return block;
    }

    // (157:8) <CollapsibleSection headerText={connection.id}>
    function create_default_slot_1(ctx) {
    	let div;
    	let t0_value = /*connection*/ ctx[23].id + "";
    	let t0;
    	let t1;
    	let br0;
    	let t2;
    	let t3_value = /*connection*/ ctx[23].source + "";
    	let t3;
    	let t4;
    	let t5_value = /*connection*/ ctx[23].target + "";
    	let t5;
    	let t6;
    	let button;
    	let br1;
    	let t8;
    	let t9_value = /*connection*/ ctx[23].sourceHandle + "";
    	let t9;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			br0 = element("br");
    			t2 = text("\r\n                Source: ");
    			t3 = text(t3_value);
    			t4 = text("  Target: ");
    			t5 = text(t5_value);
    			t6 = space();
    			button = element("button");
    			button.textContent = "Remove";
    			br1 = element("br");
    			t8 = text("\r\n                Resource: ");
    			t9 = text(t9_value);
    			add_location(br0, file, 158, 32, 5788);
    			attr_dev(button, "class", "btn btn__danger");
    			add_location(button, file, 160, 16, 5885);
    			add_location(br1, file, 160, 118, 5987);
    			attr_dev(div, "class", "content");
    			add_location(div, file, 157, 12, 5733);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, br0);
    			append_dev(div, t2);
    			append_dev(div, t3);
    			append_dev(div, t4);
    			append_dev(div, t5);
    			append_dev(div, t6);
    			append_dev(div, button);
    			append_dev(div, br1);
    			append_dev(div, t8);
    			append_dev(div, t9);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*removeConnection*/ ctx[15](/*connection*/ ctx[23], /*connection*/ ctx[23].id))) /*removeConnection*/ ctx[15](/*connection*/ ctx[23], /*connection*/ ctx[23].id).apply(this, arguments);
    					},
    					false,
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*connectionDOM*/ 8 && t0_value !== (t0_value = /*connection*/ ctx[23].id + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*connectionDOM*/ 8 && t3_value !== (t3_value = /*connection*/ ctx[23].source + "")) set_data_dev(t3, t3_value);
    			if (dirty[0] & /*connectionDOM*/ 8 && t5_value !== (t5_value = /*connection*/ ctx[23].target + "")) set_data_dev(t5, t5_value);
    			if (dirty[0] & /*connectionDOM*/ 8 && t9_value !== (t9_value = /*connection*/ ctx[23].sourceHandle + "")) set_data_dev(t9, t9_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(157:8) <CollapsibleSection headerText={connection.id}>",
    		ctx
    	});

    	return block;
    }

    // (156:4) {#each connectionDOM.filter((c)=>c.id.substring(0,6) === "xyflow") as connection, index (connection.id)}
    function create_each_block(key_1, ctx) {
    	let first;
    	let collapsiblesection;
    	let current;

    	collapsiblesection = new CollapsibleSection({
    			props: {
    				headerText: /*connection*/ ctx[23].id,
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(collapsiblesection.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(collapsiblesection, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const collapsiblesection_changes = {};
    			if (dirty[0] & /*connectionDOM*/ 8) collapsiblesection_changes.headerText = /*connection*/ ctx[23].id;

    			if (dirty[0] & /*connectionDOM*/ 8 | dirty[1] & /*$$scope*/ 128) {
    				collapsiblesection_changes.$$scope = { dirty, ctx };
    			}

    			collapsiblesection.$set(collapsiblesection_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(collapsiblesection.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(collapsiblesection.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(collapsiblesection, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(156:4) {#each connectionDOM.filter((c)=>c.id.substring(0,6) === \\\"xyflow\\\") as connection, index (connection.id)}",
    		ctx
    	});

    	return block;
    }

    // (167:4) <CollapsibleSection headerText="Full JSON">
    function create_default_slot(ctx) {
    	let t_value = (/*decBlob*/ ctx[1] && /*decBlob*/ ctx[1]) + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*decBlob*/ 2 && t_value !== (t_value = (/*decBlob*/ ctx[1] && /*decBlob*/ ctx[1]) + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(167:4) <CollapsibleSection headerText=\\\"Full JSON\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let t0;
    	let input;
    	let t1;
    	let button0;
    	let t2;
    	let button0_disabled_value;
    	let br0;
    	let t3;
    	let textarea;
    	let t4;
    	let button1;
    	let t5;
    	let button1_disabled_value;
    	let t6;
    	let button2;
    	let t7;
    	let button2_disabled_value;
    	let t8;
    	let br1;
    	let t9;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*jsonDOM*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			t0 = text("Upload: ");
    			input = element("input");
    			t1 = space();
    			button0 = element("button");
    			t2 = text("Upload");
    			br0 = element("br");
    			t3 = text("\r\nor Paste Blueprint:\r\n");
    			textarea = element("textarea");
    			t4 = space();
    			button1 = element("button");
    			t5 = text("Parse");
    			t6 = space();
    			button2 = element("button");
    			t7 = text("Save");
    			t8 = space();
    			br1 = element("br");
    			t9 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(input, "type", "file");
    			add_location(input, file, 112, 8, 3297);
    			attr_dev(button0, "class", "btn btn__primary");
    			button0.disabled = button0_disabled_value = /*files*/ ctx[5].length === 0;
    			add_location(button0, file, 112, 45, 3334);
    			add_location(br0, file, 112, 144, 3433);
    			attr_dev(textarea, "rows", "20");
    			attr_dev(textarea, "cols", "80");
    			add_location(textarea, file, 114, 0, 3460);
    			attr_dev(button1, "class", "btn btn__primary");
    			button1.disabled = button1_disabled_value = /*blob*/ ctx[0].length === 0;
    			add_location(button1, file, 115, 0, 3508);
    			attr_dev(button2, "class", "btn btn__primary");
    			button2.disabled = button2_disabled_value = !/*jsonDOM*/ ctx[2];
    			add_location(button2, file, 118, 0, 3615);
    			add_location(br1, file, 121, 0, 3711);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, input, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button0, anchor);
    			append_dev(button0, t2);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, textarea, anchor);
    			set_input_value(textarea, /*blob*/ ctx[0]);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, button1, anchor);
    			append_dev(button1, t5);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, button2, anchor);
    			append_dev(button2, t7);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t9, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*input_change_handler*/ ctx[16]),
    					listen_dev(button0, "click", /*parseFile*/ ctx[7], false, false, false, false),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[17]),
    					listen_dev(button1, "click", /*parseBlob*/ ctx[8], false, false, false, false),
    					listen_dev(button2, "click", /*saveBlob*/ ctx[9], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*files*/ 32 && button0_disabled_value !== (button0_disabled_value = /*files*/ ctx[5].length === 0)) {
    				prop_dev(button0, "disabled", button0_disabled_value);
    			}

    			if (dirty[0] & /*blob*/ 1) {
    				set_input_value(textarea, /*blob*/ ctx[0]);
    			}

    			if (!current || dirty[0] & /*blob*/ 1 && button1_disabled_value !== (button1_disabled_value = /*blob*/ ctx[0].length === 0)) {
    				prop_dev(button1, "disabled", button1_disabled_value);
    			}

    			if (!current || dirty[0] & /*jsonDOM*/ 4 && button2_disabled_value !== (button2_disabled_value = !/*jsonDOM*/ ctx[2])) {
    				prop_dev(button2, "disabled", button2_disabled_value);
    			}

    			if (/*jsonDOM*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*jsonDOM*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(textarea);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(button2);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t9);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function totalBuildings(parcel) {
    	let total = 0;

    	for (const building in parcel.buildings) {
    		total = total + parcel.buildings[building];
    	}

    	return total;
    }

    const func_2 = c => c.id.substring(0, 6) === "xyflow";

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('BlobReader', slots, []);
    	let { blob = "" } = $$props;
    	let decBlob = "";
    	let jsonDOM = null;
    	let connectionDOM = null;
    	let parcelDOM = null;
    	let files = [];
    	let filename = "";
    	let newBuilding = {};

    	function parseFile() {
    		let file = files[0];
    		filename = file.name;
    		let reader = new FileReader();

    		reader.addEventListener(
    			"load",
    			() => {
    				$$invalidate(0, blob = reader.result);
    				parseBlob();
    			},
    			false
    		);

    		reader.readAsText(file);
    	}

    	function parseBlob() {
    		$$invalidate(1, decBlob = atob(blob));
    		$$invalidate(2, jsonDOM = JSON.parse(decBlob));

    		if (jsonDOM.gameState) {
    			$$invalidate(4, parcelDOM = jsonDOM.gameState.parcels.parcelList);
    			$$invalidate(3, connectionDOM = jsonDOM.gameState.nodeConnections);
    			console.log(connectionDOM);
    		} else {
    			$$invalidate(4, parcelDOM = jsonDOM.details);
    			$$invalidate(3, connectionDOM = jsonDOM.connections);
    		}
    	}

    	function encodeBlob() {
    		$$invalidate(1, decBlob = JSON.stringify(jsonDOM));
    		$$invalidate(0, blob = btoa(decBlob));
    	}

    	function saveBlob() {
    		encodeBlob();
    		var fileBlob = new Blob([blob]);
    		console.log(fileBlob);
    		const url = window.URL.createObjectURL(fileBlob);
    		const a = document.createElement('a');
    		a.style.display = 'none';
    		a.href = url;
    		a.download = filename;
    		document.body.appendChild(a);
    		a.click();
    		window.URL.revokeObjectURL(url);
    	}

    	function incBuilding(parcel, name) {
    		let total = totalBuildings(parcel);

    		if (total < parcel.maxBuildings) {
    			let old = parcel.buildings[name];
    			parcel.buildings[name] = old + 1;
    			parcel.activeBuildings[name] = parcel.buildings[name];
    			$$invalidate(4, parcelDOM);
    		}

    		encodeBlob();
    	}

    	function decBuilding(parcel, name) {
    		let old = parcel.buildings[name];

    		if (old > 0) {
    			parcel.buildings[name] = old - 1;
    			parcel.activeBuildings[name] = parcel.buildings[name];
    			$$invalidate(4, parcelDOM);
    		}

    		encodeBlob();
    	}

    	function removeBuilding(parcel, name) {
    		delete parcel.buildings[name];
    		$$invalidate(4, parcelDOM);
    		encodeBlob();
    	}

    	function removeOutput(parcel, name) {
    		delete parcel.outputValues[name];
    		$$invalidate(4, parcelDOM);
    		encodeBlob();
    	}

    	function addBuilding(parcel, newBuilding) {
    		let total = totalBuildings(parcel);

    		if (total < parcel.maxBuildings) {
    			let nb = newBuilding[parcel.id];
    			parcel.buildings[nb] = 1;
    			console.log(parcel.buildings);
    			$$invalidate(4, parcelDOM);
    		}

    		encodeBlob();
    	}

    	function removeConnection(connection, id) {
    		$$invalidate(3, connectionDOM = connectionDOM.filter(c => c.id !== id));
    		encodeBlob();
    	}

    	const writable_props = ['blob'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<BlobReader> was created with unknown prop '${key}'`);
    	});

    	function input_change_handler() {
    		files = this.files;
    		$$invalidate(5, files);
    	}

    	function textarea_input_handler() {
    		blob = this.value;
    		$$invalidate(0, blob);
    	}

    	function select_change_handler(parcel) {
    		newBuilding[parcel.id] = select_value(this);
    		$$invalidate(6, newBuilding);
    	}

    	const func = (name, b) => b.id === name;
    	const func_1 = (name, b) => b.id === name;

    	$$self.$$set = $$props => {
    		if ('blob' in $$props) $$invalidate(0, blob = $$props.blob);
    	};

    	$$self.$capture_state = () => ({
    		allBuildings,
    		CollapsibleSection,
    		blob,
    		decBlob,
    		jsonDOM,
    		connectionDOM,
    		parcelDOM,
    		files,
    		filename,
    		newBuilding,
    		parseFile,
    		parseBlob,
    		encodeBlob,
    		saveBlob,
    		totalBuildings,
    		incBuilding,
    		decBuilding,
    		removeBuilding,
    		removeOutput,
    		addBuilding,
    		removeConnection
    	});

    	$$self.$inject_state = $$props => {
    		if ('blob' in $$props) $$invalidate(0, blob = $$props.blob);
    		if ('decBlob' in $$props) $$invalidate(1, decBlob = $$props.decBlob);
    		if ('jsonDOM' in $$props) $$invalidate(2, jsonDOM = $$props.jsonDOM);
    		if ('connectionDOM' in $$props) $$invalidate(3, connectionDOM = $$props.connectionDOM);
    		if ('parcelDOM' in $$props) $$invalidate(4, parcelDOM = $$props.parcelDOM);
    		if ('files' in $$props) $$invalidate(5, files = $$props.files);
    		if ('filename' in $$props) filename = $$props.filename;
    		if ('newBuilding' in $$props) $$invalidate(6, newBuilding = $$props.newBuilding);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		blob,
    		decBlob,
    		jsonDOM,
    		connectionDOM,
    		parcelDOM,
    		files,
    		newBuilding,
    		parseFile,
    		parseBlob,
    		saveBlob,
    		incBuilding,
    		decBuilding,
    		removeBuilding,
    		removeOutput,
    		addBuilding,
    		removeConnection,
    		input_change_handler,
    		textarea_input_handler,
    		select_change_handler,
    		func,
    		func_1
    	];
    }

    class BlobReader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { blob: 0 }, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BlobReader",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get blob() {
    		throw new Error("<BlobReader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set blob(value) {
    		throw new Error("<BlobReader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.59.2 */

    function create_fragment(ctx) {
    	let blobreader;
    	let current;
    	blobreader = new BlobReader({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(blobreader.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(blobreader, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(blobreader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(blobreader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(blobreader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ BlobReader });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
