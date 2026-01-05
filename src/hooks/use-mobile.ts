import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Hook to detect if the current viewport is mobile-sized
 *
 * Usage:
 * const isMobile = useIsMobile()
 * if (isMobile) { // render mobile layout }
 */
export function useIsMobile() {
    const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

    React.useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

        const onChange = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
        }

        // Set initial value
        onChange()

        // Listen for changes
        mql.addEventListener("change", onChange)

        return () => mql.removeEventListener("change", onChange)
    }, [])

    return !!isMobile
}

/**
 * Hook to get the current viewport dimensions
 *
 * Usage:
 * const { width, height } = useWindowSize()
 */
export function useWindowSize() {
    const [size, setSize] = React.useState<{ width: number; height: number }>({
        width: 0,
        height: 0,
    })

    React.useEffect(() => {
        const handleResize = () => {
            setSize({
                width: window.innerWidth,
                height: window.innerHeight,
            })
        }

        // Set initial size
        handleResize()

        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    return size
}

/**
 * Hook to detect if the device supports touch
 *
 * Usage:
 * const isTouch = useTouchDevice()
 */
export function useTouchDevice() {
    const [isTouch, setIsTouch] = React.useState(false)

    React.useEffect(() => {
        setIsTouch(
            "ontouchstart" in window ||
            navigator.maxTouchPoints > 0 ||
            // @ts-expect-error - msMaxTouchPoints is IE specific
            navigator.msMaxTouchPoints > 0
        )
    }, [])

    return isTouch
}

/**
 * Hook to detect screen size breakpoints
 *
 * Usage:
 * const { isSm, isMd, isLg, isXl, is2xl } = useBreakpoint()
 */
export function useBreakpoint() {
    const { width } = useWindowSize()

    return {
        isSm: width >= 640,
        isMd: width >= 768,
        isLg: width >= 1024,
        isXl: width >= 1280,
        is2xl: width >= 1536,
    }
}
