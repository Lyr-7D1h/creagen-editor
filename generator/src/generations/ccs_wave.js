const WIDTH = 1200
const HEIGHT = 675
const s = svg.svg({ width: WIDTH, height: HEIGHT })

const code =
  'var t=Object.freeze({__proto__:null,Graph:class{}});class e{vec;constructor(...t){this.vec=t}sub(t){for(const e of t.vec)this.vec[e]-=t.vec[e]}}var n=Object.freeze({__proto__:null,vec2:function(t,n){return new e(t,n)}});let r=50;let s=[];var o=Object.freeze({__proto__:null,xorshift:function(){return r^=r<<13,r^=r>>17,r^=r<<5,r},beta:function(t,e,n){const r=n?n():Math.random();return r**(1/t)/(r**(1/t)+(1-r)**(1/e))},boxMuller:function(t,e,n){return 0===s.length&&(s=function(t,e,n){let r=n();const s=n();for(;0===r;)r=n();const o=2*Math.PI,i=e*Math.sqrt(-2*Math.log(r)),h=i*Math.cos(o*s)+t,l=i*Math.cos(o*s)+t;return[h,l]}(t,e,n)),s.pop()}});function i(t,e){void 0!==e&&(e.stroke&&t.setAttribute("stroke",e.stroke.toString()),e.strokeWidth&&t.setAttribute("stroke-width",e.strokeWidth.toString()))}class h{path;element;constructor(t){this.element=document.createElementNS("http://www.w3.org/2000/svg","path"),i(this.element,t),this.path=""}html(){return this.element.setAttribute("d",this.path),this.element}moveTo(t,e){return this.path+=`M ${t} ${e}`,this}lineTo(t,e){return this.path+=`L ${t} ${e}`,this}}function l(t){return new h(t)}class c{element;constructor(t){var e,n;this.element=document.createElementNS("http://www.w3.org/2000/svg","text"),e=this.element,void 0!==(n=t)&&(i(e,n),n.content&&(e.innerHTML=n.content),n.x&&e.setAttribute("x",n.x.toString()),n.y&&e.setAttribute("y",n.y.toString()),n.dx&&e.setAttribute("dx",n.dx.toString()),n.dy&&e.setAttribute("dy",n.dy.toString()),n.rotate&&e.setAttribute("rotate",n.rotate.toString()),n.textLength&&e.setAttribute("text-length",n.textLength.toString()))}setContent(t){this.element.innerHTML=t}html(){return this.element}}function u(t){return new c(t)}class a{element;children;constructor(t){const e={width:1e3,height:1e3,fill:1,...t};this.element=document.createElementNS("http://www.w3.org/2000/svg","svg"),this.element.setAttribute("xlms","http://www.w3.org/2000/svg"),this.element.setAttribute("width",`${e.width}px`),this.element.setAttribute("height",`${e.height}px`),this.element.setAttribute("fill",`${e.fill}`),this.children=[]}path(t){const e=l(t);return this.add(e),e}text(t){const e=u(t);return this.add(e),e}add(t){this.children.push(t)}html(){const t=this.element.cloneNode(!0);console.log(t,this.element);for(const e of this.children)t.appendChild(e.html());return t}}var d=Object.freeze({__proto__:null,path:l,text:u,svg:function(t){return new a(t)}});export{t as graph,n as lagebra,o as random,d as svg};'

const SCREEN_CHARACTER_WIDTH = 180
const ITERATIONS = 300
const PART_SIZE = 1
const GRADIENT_RANGE = 100

let amp = 100
let freq = 1 / 30
let yshift = 0
let xshift = 0

function noise(max) {
  const sign = Math.random() < 0.5 ? -1 : 1
  return sign * max * random.beta(50, 50)
}

for (let i = 0; i < ITERATIONS; i++) {
  const range =
    SCREEN_CHARACTER_WIDTH +
    Math.random() * (code.length - 2 * SCREEN_CHARACTER_WIDTH)
  const content = code.substring(range, range + SCREEN_CHARACTER_WIDTH)

  amp += noise(30)
  // console.log(noise(20))
  freq += noise(1 / 2000)
  yshift += noise(3)
  xshift += noise(0.25)
  // console.log(freq)

  for (let j = 0; j < SCREEN_CHARACTER_WIDTH; j += PART_SIZE) {
    // console.log(Math.sin(j / 20) * 80)

    const offset = amp * Math.sin(j * freq + xshift) + yshift
    const y = HEIGHT / 2 + offset

    const fill = 80 - 80 * Math.abs(Math.sin(j))
    // const fill =
    //   255 -
    //   GRADIENT_RANGE -
    //   ((255 - GRADIENT_RANGE) / ITERATIONS) * i +
    //   GRADIENT_RANGE * (Math.abs(offset) / amp)
    // const fill = 100 - Math.min(Math.abs(amp), 100)
    // const fill = 0
    // console.log(amp)
    console.log(Math.pow((i + 1) / ITERATIONS, 2))
    // console.log(0.1 + 0.9 * Math.pow((i+1)/ITERATIONS,2))

    s.text({
      content: content.substring(j, j + PART_SIZE),
      x: `${j}ch`,
      y,
      fontWeight: 'bold',
      fill: `rgb(${fill},${fill},${fill})`,
      fillOpacity: 0.02 + 0.98 * Math.pow((i + 1) / ITERATIONS, 2),
    })
  }
}

container.appendChild(s.html())
