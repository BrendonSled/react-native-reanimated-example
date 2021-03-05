import React, { useRef } from 'react';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

const {
    event,
    Value,
    Clock,
    lessThan,
    greaterThan,
    divide,
    block,
    diff,
    abs,
    startClock,
    stopClock,
    cond,
    add,
    sub,
    multiply,
    eq,
    set,
} = Animated;

function spring(dt, position, velocity, anchor, mass = 1, tension = 300) {
    const dist = sub(position, anchor);
    const acc = divide(multiply(-1, tension, dist), mass);
    return set(velocity, add(velocity, multiply(dt, acc)));
}

function damping(dt, velocity, mass = 1, damping = 12) {
    const acc = divide(multiply(-1, damping, velocity), mass);
    return set(velocity, add(velocity, multiply(dt, acc)));
}

const EPS = 1e-3;
const EMPTY_FRAMES_THRESHOLDS = 5;

function stopWhenNeeded(_, position, __, clock) {
    const ds = diff(position);
    const noMovementFrames = new Value(0);

    return cond(
        lessThan(abs(ds), EPS),
        [set(noMovementFrames, add(noMovementFrames, 1)), cond(greaterThan(noMovementFrames, EMPTY_FRAMES_THRESHOLDS), stopClock(clock))],
        set(noMovementFrames, 0),
    );
}

function interaction(gestureTranslation, gestureState) {
    const dragging = new Value(0);
    const start = new Value(0);
    const position = new Value(0);
    const anchor = new Value(0);
    const velocity = new Value(0);

    const clock = new Clock();
    const dt = divide(diff(clock), 1000);

    const step = cond(
        eq(gestureState, State.ACTIVE),
        [
            cond(dragging, 0, [set(dragging, 1), set(start, position)]),
            set(anchor, add(start, gestureTranslation)),

            // spring attached to pan gesture "anchor"
            spring(dt, position, velocity, anchor),
            damping(dt, velocity),

            // spring attached to the center position (0)
            spring(dt, position, velocity, 0),
            damping(dt, velocity),
        ],
        [set(dragging, 0), startClock(clock), spring(dt, position, velocity, 0), damping(dt, velocity)],
    );

    return block([step, set(position, add(position, multiply(velocity, dt))), stopWhenNeeded(dt, position, velocity, clock), position]);
}

export default function Swipeable({ children }) {
    const dragX = useRef(new Value(0));
    const gestureState = useRef(new Value(-1));
    const onGestureEvent = useRef(
        event([
            {
                nativeEvent: {
                    translationX: dragX.current,
                    state: gestureState.current,
                },
            },
        ]),
    );
    const transX = interaction(dragX.current, gestureState.current);

    return (
        <PanGestureHandler
            maxPointers={1}
            onGestureEvent={onGestureEvent.current}
            onHandlerStateChange={onGestureEvent.current}
            minDeltaX={10}
        >
            <Animated.View style={{ transform: [{ translateX: transX }, { perspective: 200 }] }}>{children}</Animated.View>
        </PanGestureHandler>
    );
}
