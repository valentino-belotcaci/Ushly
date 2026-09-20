//Here is what the qrcode library looks like, what functions it has, 
// what arguments they accept, and what they return


//when ts sees a qrcode import, it looks at this declaration and understand what qrcode is
declare module 'qrcode' {
  type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';//low,medium,higher

  type SvgOptions = {
    errorCorrectionLevel?: ErrorCorrectionLevel;
    margin?: number;
    width?: number;
  };

  //first argument must be a string(link)
  //2nd arg: combines svgOptions with type: 'svg'
  const QRCode: {
    toString(text: string, options: SvgOptions & { type: 'svg' }): Promise<string>;
  };

  export default QRCode;
}
