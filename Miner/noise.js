// ===== SIMPLEX NOISE (Stefan Gustavson, public domain) =====
export class SimplexNoise {
    constructor(seed) {
        const perm = new Uint8Array(256);
        for (let i = 0; i < 256; i++) perm[i] = i;
        let s = seed | 0;
        for (let i = 255; i > 0; i--) {
            s = (s * 16807 + 0) & 0x7fffffff;
            const j = s % (i + 1);
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }
        this.p = new Uint8Array(512);
        for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];

        this.grad3 = [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ];
    }

    _dot2(g, x, y) { return g[0]*x + g[1]*y; }
    _dot3(g, x, y, z) { return g[0]*x + g[1]*y + g[2]*z; }

    noise2d(x, y) {
        const F2 = 0.5 * (Math.sqrt(3) - 1);
        const G2 = (3 - Math.sqrt(3)) / 6;
        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        const t = (i + j) * G2;
        const X0 = i - t, Y0 = j - t;
        const x0 = x - X0, y0 = y - Y0;
        const i1 = x0 > y0 ? 1 : 0;
        const j1 = x0 > y0 ? 0 : 1;
        const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2*G2, y2 = y0 - 1 + 2*G2;
        const ii = i & 255, jj = j & 255;
        const gi0 = this.p[ii + this.p[jj]] % 12;
        const gi1 = this.p[ii + i1 + this.p[jj + j1]] % 12;
        const gi2 = this.p[ii + 1 + this.p[jj + 1]] % 12;
        let n0 = 0, n1 = 0, n2 = 0;
        let t0 = 0.5 - x0*x0 - y0*y0;
        if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * this._dot2(this.grad3[gi0], x0, y0); }
        let t1 = 0.5 - x1*x1 - y1*y1;
        if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * this._dot2(this.grad3[gi1], x1, y1); }
        let t2 = 0.5 - x2*x2 - y2*y2;
        if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * this._dot2(this.grad3[gi2], x2, y2); }
        return 70 * (n0 + n1 + n2);
    }

    noise3d(x, y, z) {
        const F3 = 1/3, G3 = 1/6;
        const s = (x + y + z) * F3;
        const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
        const t = (i + j + k) * G3;
        const X0 = i - t, Y0 = j - t, Z0 = k - t;
        const x0 = x - X0, y0 = y - Y0, z0 = z - Z0;
        let i1, j1, k1, i2, j2, k2;
        if (x0 >= y0) {
            if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
            else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
            else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
        } else {
            if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
            else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
            else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
        }
        const x1=x0-i1+G3, y1=y0-j1+G3, z1=z0-k1+G3;
        const x2=x0-i2+2*G3, y2=y0-j2+2*G3, z2=z0-k2+2*G3;
        const x3=x0-1+3*G3, y3=y0-1+3*G3, z3=z0-1+3*G3;
        const ii=i&255, jj=j&255, kk=k&255;
        const gi0=this.p[ii+this.p[jj+this.p[kk]]]%12;
        const gi1=this.p[ii+i1+this.p[jj+j1+this.p[kk+k1]]]%12;
        const gi2=this.p[ii+i2+this.p[jj+j2+this.p[kk+k2]]]%12;
        const gi3=this.p[ii+1+this.p[jj+1+this.p[kk+1]]]%12;
        let n0=0,n1=0,n2=0,n3=0;
        let t0=0.6-x0*x0-y0*y0-z0*z0;
        if(t0>0){t0*=t0;n0=t0*t0*this._dot3(this.grad3[gi0],x0,y0,z0);}
        let t1=0.6-x1*x1-y1*y1-z1*z1;
        if(t1>0){t1*=t1;n1=t1*t1*this._dot3(this.grad3[gi1],x1,y1,z1);}
        let t2=0.6-x2*x2-y2*y2-z2*z2;
        if(t2>0){t2*=t2;n2=t2*t2*this._dot3(this.grad3[gi2],x2,y2,z2);}
        let t3=0.6-x3*x3-y3*y3-z3*z3;
        if(t3>0){t3*=t3;n3=t3*t3*this._dot3(this.grad3[gi3],x3,y3,z3);}
        return 32*(n0+n1+n2+n3);
    }
}

export function fbm2d(noise, x, z, octaves, freq, amp) {
    let val = 0, f = freq, a = amp;
    for (let i = 0; i < octaves; i++) {
        val += noise.noise2d(x * f, z * f) * a;
        f *= 2;
        a *= 0.5;
    }
    return val;
}
