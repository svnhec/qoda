"use client"

import * as React from "react"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

type ToastActionElement = React.ReactElement<{
    altText: string
    onClick: () => void
}>

export type ToastVariant = "default" | "success" | "error" | "warning" | "info"

export interface Toast {
    id: string
    title?: string
    description?: string
    variant?: ToastVariant
    action?: ToastActionElement
    duration?: number
    onDismiss?: () => void
}

interface ToastState {
    toasts: Toast[]
}

type ToastAction =
    | { type: "ADD_TOAST"; toast: Toast }
    | { type: "UPDATE_TOAST"; toast: Partial<Toast> & { id: string } }
    | { type: "DISMISS_TOAST"; toastId: string }
    | { type: "REMOVE_TOAST"; toastId: string }

let count = 0
function genId() {
    count = (count + 1) % Number.MAX_SAFE_INTEGER
    return count.toString()
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

function addToRemoveQueue(toastId: string, duration: number = TOAST_REMOVE_DELAY) {
    if (toastTimeouts.has(toastId)) {
        return
    }

    const timeout = setTimeout(() => {
        toastTimeouts.delete(toastId)
        dispatch({ type: "REMOVE_TOAST", toastId })
    }, duration)

    toastTimeouts.set(toastId, timeout)
}

const reducer = (state: ToastState, action: ToastAction): ToastState => {
    switch (action.type) {
        case "ADD_TOAST":
            return {
                ...state,
                toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
            }

        case "UPDATE_TOAST":
            return {
                ...state,
                toasts: state.toasts.map((t) =>
                    t.id === action.toast.id ? { ...t, ...action.toast } : t
                ),
            }

        case "DISMISS_TOAST": {
            const { toastId } = action
            const toast = state.toasts.find((t) => t.id === toastId)
            if (toast?.onDismiss) {
                toast.onDismiss()
            }
            addToRemoveQueue(toastId)
            return state
        }

        case "REMOVE_TOAST":
            if (action.toastId === undefined) {
                return { ...state, toasts: [] }
            }
            return {
                ...state,
                toasts: state.toasts.filter((t) => t.id !== action.toastId),
            }

        default:
            return state
    }
}

const listeners: Array<(state: ToastState) => void> = []
let memoryState: ToastState = { toasts: [] }

function dispatch(action: ToastAction) {
    memoryState = reducer(memoryState, action)
    listeners.forEach((listener) => listener(memoryState))
}

interface ToastOptions {
    title?: string
    description?: string
    variant?: ToastVariant
    action?: ToastActionElement
    duration?: number
    onDismiss?: () => void
}

function toast(options: ToastOptions) {
    const id = genId()
    const duration = options.duration ?? TOAST_REMOVE_DELAY

    dispatch({
        type: "ADD_TOAST",
        toast: {
            id,
            ...options,
            duration,
        },
    })

    // Auto dismiss after duration
    addToRemoveQueue(id, duration)

    return {
        id,
        dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id }),
        update: (props: Partial<ToastOptions>) =>
            dispatch({ type: "UPDATE_TOAST", toast: { id, ...props } }),
    }
}

// Convenience methods
toast.success = (title: string, description?: string) =>
    toast({ title, description, variant: "success" })

toast.error = (title: string, description?: string) =>
    toast({ title, description, variant: "error" })

toast.warning = (title: string, description?: string) =>
    toast({ title, description, variant: "warning" })

toast.info = (title: string, description?: string) =>
    toast({ title, description, variant: "info" })

toast.promise = async <T>(
    promise: Promise<T>,
    options: {
        loading: string
        success: string | ((data: T) => string)
        error: string | ((err: unknown) => string)
    }
): Promise<T> => {
    const id = genId()

    dispatch({
        type: "ADD_TOAST",
        toast: {
            id,
            title: options.loading,
            variant: "default",
        },
    })

    try {
        const result = await promise

        dispatch({
            type: "UPDATE_TOAST",
            toast: {
                id,
                title: typeof options.success === "function" ? options.success(result) : options.success,
                variant: "success",
            },
        })

        addToRemoveQueue(id)
        return result
    } catch (err) {
        dispatch({
            type: "UPDATE_TOAST",
            toast: {
                id,
                title: typeof options.error === "function" ? options.error(err) : options.error,
                variant: "error",
            },
        })

        addToRemoveQueue(id)
        throw err
    }
}

/**
 * Hook to access and manage toast notifications
 *
 * Usage:
 * const { toast, toasts, dismiss } = useToast()
 *
 * // Simple toast
 * toast({ title: "Hello!", description: "This is a toast" })
 *
 * // Variants
 * toast.success("Saved successfully!")
 * toast.error("Something went wrong")
 * toast.warning("Please review your input")
 * toast.info("New update available")
 *
 * // Promise toast
 * toast.promise(saveData(), {
 *   loading: "Saving...",
 *   success: "Saved!",
 *   error: "Failed to save"
 * })
 */
export function useToast() {
    const [state, setState] = React.useState<ToastState>(memoryState)

    React.useEffect(() => {
        listeners.push(setState)
        return () => {
            const index = listeners.indexOf(setState)
            if (index > -1) {
                listeners.splice(index, 1)
            }
        }
    }, [])

    return {
        toast,
        toasts: state.toasts,
        dismiss: (toastId: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
        dismissAll: () => dispatch({ type: "REMOVE_TOAST", toastId: undefined as unknown as string }),
    }
}

export { toast }
