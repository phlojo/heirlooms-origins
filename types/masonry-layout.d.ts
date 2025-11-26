declare module 'masonry-layout' {
  interface MasonryOptions {
    columnWidth?: number | string
    itemSelector?: string
    gutter?: number
    percentPosition?: boolean
    stamp?: string | HTMLElement
    fitWidth?: boolean
    originLeft?: boolean
    originTop?: boolean
    transitionDuration?: string | number
  }

  class Masonry {
    constructor(element: Element | string, options?: MasonryOptions)
    reloadItems(): void
    layout(): void
    layoutItems(items: Element[], isAnimating?: boolean): void
    destroy(): void
    addItems(elements: Element[]): void
    remove(elements: Element[]): void
    getItemElements(): Element[]
  }

  export = Masonry
}
