const s = svg.svg({ width: 1200, height: 675 })

const code =
  'var t=Object.freeze({__proto__:null,Graph:class{}});class e{vec;constructor(...t){this.vec=t}sub(t){for(const e of t.vec)this.vec[e]-=t.vec[e]}}var n=Object.freeze({__proto__:null,vec2:function(t,n){return new e(t,n)}});let r=50;let s=[];var o=Object.freeze({__proto__:null,xorshift:function(){return r^=r<<13,r^=r>>17,r^=r<<5,r},beta:function(t,e,n){const r=n?n():Math.random();return r**(1/t)/(r**(1/t)+(1-r)**(1/e))},boxMuller:function(t,e,n){return 0===s.length&&(s=function(t,e,n){let r=n();const s=n();for(;0===r;)r=n();const o=2*Math.PI,i=e*Math.sqrt(-2*Math.log(r)),h=i*Math.cos(o*s)+t,l=i*Math.cos(o*s)+t;return[h,l]}(t,e,n)),s.pop()}});function i(t,e){void 0!==e&&(e.stroke&&t.setAttribute("stroke",e.stroke.toString()),e.strokeWidth&&t.setAttribute("stroke-width",e.strokeWidth.toString()))}class h{path;element;constructor(t){this.element=document.createElementNS("http://www.w3.org/2000/svg","path"),i(this.element,t),this.path=""}html(){return this.element.setAttribute("d",this.path),this.element}moveTo(t,e){return this.path+=`M ${t} ${e}`,this}lineTo(t,e){return this.path+=`L ${t} ${e}`,this}}function l(t){return new h(t)}class c{element;constructor(t){var e,n;this.element=document.createElementNS("http://www.w3.org/2000/svg","text"),e=this.element,void 0!==(n=t)&&(i(e,n),n.content&&(e.innerHTML=n.content),n.x&&e.setAttribute("x",n.x.toString()),n.y&&e.setAttribute("y",n.y.toString()),n.dx&&e.setAttribute("dx",n.dx.toString()),n.dy&&e.setAttribute("dy",n.dy.toString()),n.rotate&&e.setAttribute("rotate",n.rotate.toString()),n.textLength&&e.setAttribute("text-length",n.textLength.toString()))}setContent(t){this.element.innerHTML=t}html(){return this.element}}function u(t){return new c(t)}class a{element;children;constructor(t){const e={width:1e3,height:1e3,fill:1,...t};this.element=document.createElementNS("http://www.w3.org/2000/svg","svg"),this.element.setAttribute("xlms","http://www.w3.org/2000/svg"),this.element.setAttribute("width",`${e.width}px`),this.element.setAttribute("height",`${e.height}px`),this.element.setAttribute("fill",`${e.fill}`),this.children=[]}path(t){const e=l(t);return this.add(e),e}text(t){const e=u(t);return this.add(e),e}add(t){this.children.push(t)}html(){const t=this.element.cloneNode(!0);console.log(t,this.element);for(const e of this.children)t.appendChild(e.html());return t}}var d=Object.freeze({__proto__:null,path:l,text:u,svg:function(t){return new a(t)}});export{t as graph,n as lagebra,o as random,d as svg};'

const screenCharacterWidth = 180
const partSize = 1
for (let i = -2; i < 80; i++) {
  const r =
    screenCharacterWidth +
    Math.random() * (code.length - 2 * screenCharacterWidth)
  const content = code.substring(r, r + screenCharacterWidth)

  for (let j = 0; j < screenCharacterWidth; j += partSize) {
    console.log(Math.sin(j / 20) * 80)
    const offset = Math.sin(j / 10)
    const y = i * 15 + offset * 40
    const corner = 80 - 80 * offset
    s.text({
      content: content.substring(j, j + partSize),
      // stroke: 'black',
      strokeWidth: 20,
      x: j * 10,
      y,
      fontWeight: Math.abs(offset) * 1000,
      fill: `rgb(${corner},${corner},${corner})`,
      // transform: `rotate(${Math.sin(j / 40) * 20})`,
      // transform: "skewY(30)"
    })
      // HACK
      .html()
      .setAttribute('x', `${j}ch`)
  }
}

container.appendChild(s.html())
