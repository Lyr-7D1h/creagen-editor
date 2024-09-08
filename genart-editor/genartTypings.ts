export const genartTypings = `declare function max(array: ArrayLike<number>): number;
declare function min(array: ArrayLike<number>): number;
declare function gcd(a: number, b: number): number;
declare function mod(n: number, m: number): number;
declare function roundToDec(n: number, dec?: number): number;

declare const math_d_gcd: typeof gcd;
declare const math_d_max: typeof max;
declare const math_d_min: typeof min;
declare const math_d_mod: typeof mod;
declare const math_d_roundToDec: typeof roundToDec;
declare namespace math_d {
  export { math_d_gcd as gcd, math_d_max as max, math_d_min as min, math_d_mod as mod, math_d_roundToDec as roundToDec };
}

declare class Graph {
}

type graph_d_Graph = Graph;
declare const graph_d_Graph: typeof Graph;
declare namespace graph_d {
  export { graph_d_Graph as Graph };
}

type TypedArray = Int8Array | Int16Array | Int32Array | Uint8Array | Uint8ClampedArray | Uint16Array | Uint32Array | Float32Array | Float64Array;
type Data = NDArray<Data> | TypedArray | number[] | Data[];
/**
 * N Dimensional Array - a wrapper around Array<number> and TypedArrays
 */
declare class NDArray<I extends Data> {
    private readonly _data;
    private readonly _shape;
    constructor(data: I);
    [index: number]: number;
    /** Synonym to get */
    at(...index: number[]): number;
    get(...index: number[]): number;
    set(x: number, value: number): void;
    get length(): number;
    data(): I;
    [Symbol.iterator](): {
        next: () => {
            value: number | Data;
            done: boolean;
        };
    };
    slice(start?: number, end?: number): NDArray<I>;
    all(): Iterator<I>;
    /** Get the dimensions of this array */
    shape(): number[];
    /** Get the total number of numbers in the array */
    count(): number;
    /** Take the average of all the values */
    average(): number;
    /** Calculate the average difference from the average */
    spread(): number;
    /** Normalize array */
    max(): any;
    min(): any;
}
declare function ndarray<I extends Data>(data: I): NDArray<I>;
interface Iterator<I extends Data> {
    array: NDArray<I>;
    [Symbol.iterator]: () => {
        next: () => {
            value: number;
            done: boolean;
        };
    };
}

type lin_d_Data = Data;
type lin_d_Iterator<I extends Data> = Iterator<I>;
type lin_d_NDArray<I extends Data> = NDArray<I>;
declare const lin_d_NDArray: typeof NDArray;
declare const lin_d_ndarray: typeof ndarray;
declare namespace lin_d {
  export { type lin_d_Data as Data, type lin_d_Iterator as Iterator, lin_d_NDArray as NDArray, lin_d_ndarray as ndarray };
}

declare function simplexSeed(random: RandomFn): void;
declare function simplex(x: number, y: number): number;
declare function simplex(x: number, y: number, z: number): number;
declare function simplex(x: number, y: number, z: number, w: number): number;

declare function perlin(x: number, y: number, z: number): number;

/**
 * A random() function, must return a number in the interval [0,1), just like Math.random().
 */
type RandomFn = () => number;
declare function rng(randomFn?: RandomFn): RandomNumberGenerator;
declare class RandomNumberGenerator {
    private readonly randomFn;
    constructor(random: RandomFn);
    integer(start: number): number;
    integer(start: number, stop: number): number;
    random(): number;
}
declare function random(): RandomNumberGenerator;
/** TODO: https://en.wikipedia.org/wiki/Linear_congruential_generator */
declare function xorshift(seed?: number): RandomNumberGenerator;
/** https://en.wikipedia.org/wiki/Beta_distribution */
declare function beta(alpha: number, beta: number, uniformGenerator?: () => number): number;
declare function boxMuller(mean: number, deviation: number, uniformGenerator: () => number): number;

/** https://en.wikipedia.org/wiki/Cumulative_distribution_function */
declare class CDF {
    p: number[];
    f: number[];
    static fromPMF(pmf: PMF): CDF;
    static uniform(length: number): CDF;
    /** Create a cdf from non normalized list of numbers */
    static fromWeights(values: number[]): CDF;
    /** create cdf from probabilities going up from 0 to 1 */
    constructor(p: number[]);
    /** from a list of numbers that sum up to 1 */
    private fromProbabilities;
    [Symbol.iterator](): IterableIterator<number>;
    clone(): CDF;
    updateWeight(index: number, p: number): void;
    add(pmf: PMF): CDF;
    add(cdf: CDF): CDF;
    /** draw a random number from pmf */
    draw(): number;
}

/** https://en.wikipedia.org/wiki/Probability_mass_function */
declare class PMF {
    p: number[];
    /** create pmf from non normalized list of numbers */
    fromWeights(values: number[]): PMF;
    /** create pmf from normalized list (all numbers add to 1)  */
    constructor(p: number[]);
    [Symbol.iterator](): IterableIterator<number>;
    cdf(): CDF;
}

type index_d_CDF = CDF;
declare const index_d_CDF: typeof CDF;
type index_d_PMF = PMF;
declare const index_d_PMF: typeof PMF;
type index_d_RandomFn = RandomFn;
type index_d_RandomNumberGenerator = RandomNumberGenerator;
declare const index_d_RandomNumberGenerator: typeof RandomNumberGenerator;
declare const index_d_beta: typeof beta;
declare const index_d_boxMuller: typeof boxMuller;
declare const index_d_perlin: typeof perlin;
declare const index_d_random: typeof random;
declare const index_d_rng: typeof rng;
declare const index_d_simplex: typeof simplex;
declare const index_d_simplexSeed: typeof simplexSeed;
declare const index_d_xorshift: typeof xorshift;
declare namespace index_d {
  export { index_d_CDF as CDF, index_d_PMF as PMF, type index_d_RandomFn as RandomFn, index_d_RandomNumberGenerator as RandomNumberGenerator, index_d_beta as beta, index_d_boxMuller as boxMuller, index_d_perlin as perlin, index_d_random as random, index_d_rng as rng, index_d_simplex as simplex, index_d_simplexSeed as simplexSeed, index_d_xorshift as xorshift };
}

interface GeometricOptions {
    fill?: string;
    fillOpacity?: number | string;
    stroke?: string;
    strokeWidth?: number;
    transform?: string;
}
interface PathOptions extends GeometricOptions {
}
declare class Path {
    private path;
    private readonly element;
    constructor(options?: PathOptions);
    html(): SVGPathElement;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    /** Quadratic Bezier Curve */
    qCurve(x: number, y: number, dx: number, dy: number): this & {
        tCurve: (x: number, y: number) => void;
    };
}
declare function path(options?: PathOptions): Path;
interface RectangleOptions extends GeometricOptions {
    x?: number | string;
    y?: number | string;
    rx?: number;
    ry?: number;
}
declare class Rectangle {
    private readonly element;
    constructor(width: number, height: number, options?: RectangleOptions);
    html(): SVGRectElement;
}
declare function rect(width: number, height: number, options?: RectangleOptions): Rectangle;
interface TextOptions extends GeometricOptions {
    content?: string;
    x?: number | string;
    y?: number | string;
    dx?: number | string;
    dy?: number | string;
    rotate?: number;
    textLength?: number;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
}
declare class Text {
    private readonly element;
    constructor(options?: TextOptions);
    setContent(text: string): void;
    html(): SVGTextElement;
}
declare function text(options?: TextOptions): Text;
interface CircleOptions extends GeometricOptions {
    cx?: number;
    cy?: number;
}
declare class Circle {
    private readonly element;
    constructor(r: number | string, options?: CircleOptions);
    html(): SVGCircleElement;
}
declare function circle(r: number | string, options?: CircleOptions): Circle;
type SvgChild = Path | Text | Rectangle | Circle;
interface SvgOptions {
    width?: number | string;
    height?: number | string;
    fill?: string;
}
declare class Svg {
    element: SVGElement;
    children: SvgChild[];
    private readonly options?;
    constructor(options?: SvgOptions);
    path(options?: PathOptions): Path;
    circle(r: number | string, options?: CircleOptions): Circle;
    rect(width: number, height: number, options?: RectangleOptions): Rectangle;
    text(options?: TextOptions): Text;
    add(element: SvgChild): void;
    html(): SVGElement;
    width(): number | null;
    height(): number | null;
    /** Create a grid onto your svg with boxes of width and height */
    grid(size: number): void;
    grid(width: number, height: number): void;
}
declare function svg(options?: SvgOptions): Svg;

type svg_d_CircleOptions = CircleOptions;
type svg_d_GeometricOptions = GeometricOptions;
type svg_d_PathOptions = PathOptions;
type svg_d_RectangleOptions = RectangleOptions;
type svg_d_SvgChild = SvgChild;
type svg_d_SvgOptions = SvgOptions;
type svg_d_TextOptions = TextOptions;
declare const svg_d_circle: typeof circle;
declare const svg_d_path: typeof path;
declare const svg_d_rect: typeof rect;
declare const svg_d_svg: typeof svg;
declare const svg_d_text: typeof text;
declare namespace svg_d {
  export { type svg_d_CircleOptions as CircleOptions, type svg_d_GeometricOptions as GeometricOptions, type svg_d_PathOptions as PathOptions, type svg_d_RectangleOptions as RectangleOptions, type svg_d_SvgChild as SvgChild, type svg_d_SvgOptions as SvgOptions, type svg_d_TextOptions as TextOptions, svg_d_circle as circle, svg_d_path as path, svg_d_rect as rect, svg_d_svg as svg, svg_d_text as text };
}

declare class Image {
    private readonly img;
    private pixeldata;
    private pixelsLoaded;
    constructor(input: string);
    /** load pixel data using html canvas */
    loadPixels(): Promise<void>;
    width(): number;
    height(): number;
    pixels(): Uint8ClampedArray;
    get(x: number, y: number): Uint8ClampedArray;
    get(x: number, y: number, dx: number, dy: number): Uint8ClampedArray[];
    html(): HTMLImageElement;
}
/** @param input url or base64 string with image data */
declare function image(input: string): Promise<Image>;

declare const image_d_image: typeof image;
declare namespace image_d {
  export { image_d_image as image };
}

declare class Color {
    c: number[] | Uint8ClampedArray;
    static fromHex(hex: string): Color;
    constructor(r: number, g: number, b: number, a?: number);
    constructor(color: number[] | Uint8ClampedArray);
    get r(): number;
    set r(v: number);
    get g(): number;
    set g(v: number);
    get b(): number;
    set b(v: number);
    get a(): number;
    set a(v: number);
    mix(color: Color): Color;
    clone(): Color;
    scale(s: number): this;
    normalize(): this;
    add(color: Color): this;
    gradient(color: Color, percentage: number): this;
    rgb(): string;
    hex(): string;
    u32(): number;
}

type color_d_Color = Color;
declare const color_d_Color: typeof Color;
declare namespace color_d {
  export { color_d_Color as Color };
}

type Y<N extends number> = N extends 3 ? number : N extends 2 ? number : undefined;
type Z<N extends number> = N extends 3 ? number : undefined;
type GrowToSize<T, N extends number, A extends T[], L extends number = A['length']> = L extends N ? A : L extends 999 ? T[] : GrowToSize<T, N, [...A, T]>;
type FixedArray<T, N extends number> = GrowToSize<T, N, [], 0>;
declare class Vector<N extends number> extends Array<number> {
    constructor(...items: [number[] & {
        length: N;
    }]);
    constructor(...items: number[] & {
        length: N;
    });
    constructor(...items: number[]);
    get length(): N;
    push(): number;
    pop(): number | undefined;
    clone(): Vector<N>;
    /** mutable mapping oftor values */
    mutmap(callbackfn: (value: number, index: number, array: number[]) => number): this;
    get(i: number): number;
    set(i: number, v: number): void;
    add(v: Vector<N>): this;
    /** normalize */
    norm(): this;
    sub(v: Vector<N>): this;
    roundToDec(dec?: number): this;
    round(): this;
    mul(s: number): this;
    floor(): this;
    scale(s: number): this;
    /** airthmetic mean */
    mean(): number;
    /** airthmetic average */
    average(): number;
    /** magnitude squared */
    mag2(): number;
    wraparound(limits: FixedArray<[number, number], N>): this;
    sum(): number;
    get x(): number;
    get y(): Y<N>;
    get z(): Z<N>;
}
declare function vec<N extends number>(...items: [number[] & {
    length: N;
}]): Vector<N>;
declare function vec<N extends number>(...items: [...number[]] & {
    length: N;
}): Vector<N>;
declare function vec<N extends number>(...items: [...number[]]): Vector<N>;

declare class Canvas {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    constructor(width?: number, height?: number);
    get width(): number;
    get height(): number;
    circle(): void;
    rectangle(p: Vector<2>, size: number): void;
    rectangle(p: Vector<2>, width: number, height: number): void;
    rectangle(x: number, y: number, size: number): void;
    rectangle(x: number | Vector<2>, y: number, width: number, height?: number): void;
    clear(): void;
    html(): HTMLCanvasElement;
}
declare function canvas(width?: number, height?: number): Canvas;

declare global {
    interface Window {
        genart: {
            config: {
                precision?: number;
                asserts: boolean;
            };
        };
    }
}

export { canvas, color_d as color, graph_d as graph, image_d as image, lin_d as lin, math_d as math, index_d as random, svg_d as svg, vec };
`