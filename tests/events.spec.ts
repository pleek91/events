import { describe, expect, test, vi } from 'vitest'
import { createEmitter } from '../src/main'

async function timeout(delay: number = 0): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(() => resolve(), delay)
  })
}

test('calls the handler when an event is emitted', () => {
  const handler = vi.fn()
  const emitter = createEmitter<{ hello: void }>()

  emitter.on('hello', handler)

  emitter.emit('hello')

  expect(handler).toBeCalled()
  expect(handler).toBeCalledWith(undefined)
})

test('calls global handler when any event is emitted', () => {
  const handler = vi.fn()
  const emitter = createEmitter<{
    hello: void,
    goodbye: void,
  }>()

  emitter.on(handler)
  emitter.on(handler)

  emitter.emit('hello')
  emitter.emit('goodbye')

  expect(handler).toBeCalledTimes(2)
})

describe('when on is used', () => {
  test('calls the handler each time', () => {
    const eventHandler = vi.fn()
    const globalHandler = vi.fn()
    const emitter = createEmitter<{ hello: void }>()

    emitter.on('hello', eventHandler)
    emitter.on(globalHandler)

    expect(eventHandler).toHaveBeenCalledTimes(0)
    expect(globalHandler).toHaveBeenCalledTimes(0)

    emitter.emit('hello')

    expect(eventHandler).toHaveBeenCalledTimes(1)
    expect(globalHandler).toHaveBeenCalledTimes(1)

    emitter.emit('hello')

    expect(eventHandler).toHaveBeenCalledTimes(2)
    expect(globalHandler).toHaveBeenCalledTimes(2)
  })

  test('does not call the handler if it is removed', () => {
    const eventHandler = vi.fn()
    const globalHandler = vi.fn()
    const emitter = createEmitter<{ hello: void }>()

    const offEvent = emitter.on('hello', eventHandler)
    const offGlobal = emitter.on(globalHandler)

    offEvent()
    offGlobal()

    emitter.emit('hello')

    expect(eventHandler).toHaveBeenCalledTimes(0)
    expect(globalHandler).toHaveBeenCalledTimes(0)
  })

  test('does not call the handler after it is removed', () => {
    const eventHandler = vi.fn()
    const globalHandler = vi.fn()
    const emitter = createEmitter<{ hello: void }>()

    const offEvent = emitter.on('hello', eventHandler)
    const offGlobal = emitter.on(globalHandler)

    emitter.emit('hello')
    
    offEvent()
    offGlobal()

    emitter.emit('hello')
    emitter.emit('hello')

    expect(eventHandler).toHaveBeenCalledTimes(1)
    expect(globalHandler).toHaveBeenCalledTimes(1)
  })

  test('does not call the handler if signal is aborted', () => {
    const eventHandler = vi.fn()
    const globalHandler = vi.fn()
    const controller = new AbortController()
    const emitter = createEmitter<{ hello: void }>()

    emitter.on('hello', eventHandler, { signal: controller.signal })
    emitter.on(globalHandler, { signal: controller.signal })

    controller.abort()
    
    emitter.emit('hello')

    expect(eventHandler).toHaveBeenCalledTimes(0)
    expect(globalHandler).toHaveBeenCalledTimes(0)
  })

  test('does not call the handler after signal is aborted', () => {
    const eventHandler = vi.fn()
    const globalHandler = vi.fn()
    const controller = new AbortController()
    const emitter = createEmitter<{ hello: void }>()

    emitter.on('hello', eventHandler, { signal: controller.signal })
    emitter.on(globalHandler, { signal: controller.signal })

    emitter.emit('hello')
    
    controller.abort()
    
    emitter.emit('hello')
    emitter.emit('hello')

    expect(eventHandler).toHaveBeenCalledTimes(1)
    expect(globalHandler).toHaveBeenCalledTimes(1)
  })
})

describe('when once is used', () => {
  test('calls the handler one time', () => {
    const eventHandler = vi.fn()
    const globalHandler = vi.fn()
    const emitter = createEmitter<{ hello: void }>()

    emitter.once('hello', eventHandler)
    emitter.once(globalHandler)

    emitter.emit('hello')
    emitter.emit('hello')

    expect(eventHandler).toHaveBeenCalledOnce()
    expect(globalHandler).toHaveBeenCalledOnce()
  })

  test('does not call the handler if it is removed', () => {
    const handler = vi.fn()
    const emitter = createEmitter<{ hello: void }>()

    const off = emitter.once('hello', handler)

    off()

    emitter.emit('hello')

    expect(handler).not.toHaveBeenCalled()
  })

  test('does not call the handler if signal is aborted', () => {
    const handler = vi.fn()
    const controller = new AbortController()
    const emitter = createEmitter<{ hello: void }>()

    emitter.once('hello', handler, { signal: controller.signal })

    controller.abort()

    emitter.emit('hello')

    expect(handler).not.toHaveBeenCalled()
  })
})

describe('when next is used', () => {
  test('returns the event payload', async () => {
    const emitter = createEmitter<{ hello: string }>()

    const event = emitter.next('hello')

    emitter.emit('hello', 'world')

    await expect(event).resolves.toEqual('world')
  })

  test('when timeout is used, rejects if the event is not emitted', async () => {
    vi.useFakeTimers()
    const emitter = createEmitter()

    await expect(() => {
      const payload = emitter.next({ timeout: 100 })
      vi.advanceTimersByTime(100)

      return payload
    }).rejects.toThrowError('Timeout waiting for global event after 100ms')

    vi.useRealTimers()
  })
})

describe('when off is called', () => {
  test('stops calling the handler', () => {
    const handler = vi.fn()
    const emitter = createEmitter<{ hello: void }>()

    emitter.on('hello', handler)

    emitter.emit('hello')
    emitter.emit('hello')
    emitter.off('hello', handler)
    emitter.emit('hello')

    expect(handler).toHaveBeenCalledTimes(2)
  })

  test('stops calling global handler', () => {
    const handler = vi.fn()
    const emitter = createEmitter<{ hello: void }>()

    emitter.on(handler)

    emitter.emit('hello')
    emitter.emit('hello')
    emitter.off(handler)
    emitter.emit('hello')

    expect(handler).toHaveBeenCalledTimes(2)
  })

  test('given event without handler, removes all', () => {
    const handlerA = vi.fn()
    const handlerB = vi.fn()
    const emitter = createEmitter<{ hello: void }>()

    emitter.on('hello', handlerA)
    emitter.on('hello', handlerB)

    emitter.emit('hello')
    emitter.emit('hello')
    emitter.off('hello')
    emitter.emit('hello')

    expect(handlerA).toHaveBeenCalledTimes(2)
    expect(handlerB).toHaveBeenCalledTimes(2)
  })
})

describe('when returned off is called', () => {
  test('stops calling the handler', () => {
    const handler = vi.fn()
    const emitter = createEmitter<{ hello: void }>()

    const off = emitter.on('hello', handler)

    emitter.emit('hello')
    emitter.emit('hello')
    off()
    emitter.emit('hello')

    expect(handler).toHaveBeenCalledTimes(2)
  })

  test('stops calling global handler', () => {
    const handler = vi.fn()
    const emitter = createEmitter<{ hello: void }>()

    const off = emitter.on(handler)

    emitter.emit('hello')
    emitter.emit('hello')
    off()
    emitter.emit('hello')

    expect(handler).toHaveBeenCalledTimes(2)
  })
})

describe('when clear is called', () => {
  test('stops calling all handlers', () => {
    const handler = vi.fn()
    const emitter = createEmitter<{ hello: void }>()

    emitter.on('hello', handler)
    emitter.on(handler)

    emitter.emit('hello')
    emitter.clear()
    emitter.emit('hello')

    expect(handler).toHaveBeenCalledTimes(2)
  })
})

describe('when using useBroadcastChannel', () => {
  test('event handler is called on multiple emitters', async () => {
    const broadcastChannel = 'my-channel'
    const channel = new BroadcastChannel(broadcastChannel)
    const handlerA = vi.fn()
    const handlerB = vi.fn()
    const emitterA = createEmitter<{ hello: void }>({ broadcastChannel })
    const emitterB = createEmitter<{ hello: void }>({ broadcastChannel })

    emitterA.on('hello', handlerA)
    emitterB.on('hello', handlerB)

    const channelReceivedMessage = new Promise<void>(resolve => {
      channel.addEventListener('message', (message) => {
        if(message.data.event === 'hello'){
          setTimeout(() => resolve())
        }
      })
    })
    
    emitterA.emit('hello')
    
    await channelReceivedMessage

    expect(handlerB).toHaveBeenCalledOnce()
  })
})

test('broadcast channel can be set after emitter is created', async () => {
  const emitter = createEmitter<{ hello: void}>()
  
  const handlerA = vi.fn()
  const channelA = new BroadcastChannel('ChannelA')
  channelA.onmessage = handlerA

  const handlerB = vi.fn()
  const channelB = new BroadcastChannel('ChannelB')
  channelB.onmessage = handlerB

  emitter.emit('hello')

  await timeout()

  expect(handlerA).not.toHaveBeenCalled()
  expect(handlerB).not.toHaveBeenCalled()

  emitter.setOptions({ broadcastChannel: 'ChannelA' })

  emitter.emit('hello')

  await timeout()

  expect(handlerA).toHaveBeenCalledOnce()
  expect(handlerB).not.toHaveBeenCalled()

  emitter.setOptions({ broadcastChannel: 'ChannelB' })

  emitter.emit('hello')

  await timeout()

  expect(handlerA).toHaveBeenCalledOnce()
  expect(handlerB).toHaveBeenCalledOnce()
})

test('next without event returns the global event payload', async () => {
  const emitter = createEmitter<{ hello: string }>()

  const event = emitter.next()

  emitter.emit('hello', 'world')

  await expect(event).resolves.toEqual({
    kind: 'hello',
    payload: 'world',
  })
})