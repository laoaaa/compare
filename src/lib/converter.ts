import * as OpenCC from 'opencc-js';

// Initialize converter: Traditional (HK/TW) to Simplified (CN)
// We use 'hk' as source to cover most traditional cases, converting to 'cn'
const converter = OpenCC.Converter({ from: 'hk', to: 'cn' });

export async function convertToSimplified(text: string): Promise<string> {
  // OpenCC-js is synchronous, but we keep the signature async to match potential future needs
  // or to avoid blocking UI if we were to wrap it in a worker (though JS main thread is fine for reasonable text size)
  // For very large text, this might block, but let's assume reasonable size for now.
  
  // Also handle TW specific variants if needed, but 'hk' -> 'cn' is generally robust for standard traditional.
  // Alternatively we can chain converters if needed.
  
  return converter(text);
}
