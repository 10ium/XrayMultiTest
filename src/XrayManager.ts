import { XrayConfig, TestResult, DiagnosticReport, SiteStatus } from './types';

// Cleans up control characters, normalizes base64, and safely decodes it
function decodeBase64Safe(str: string): string {
  let cleaned = str.replace(/[^a-zA-Z0-9+/=_-]/g, "");
  cleaned = cleaned.replace(/-/g, "+").replace(/_/g, "/");
  while (cleaned.length % 4) {
    cleaned += "=";
  }
  try {
    return atob(cleaned);
  } catch (e) {
    return "";
  }
}

// Splits concatenated configurations that are pasted without line breaks (e.g. vless://...vmess://...)
function splitConcatenatedLinks(text: string): string[] {
  const protocolRegex = /(vless|vmess|ss|trojan|socks5|socks|http|https|wireguard|wg|hysteria2|hy2|hysteria|tunnel|xhttp):\/\//gi;
  const matches: { index: number; protocol: string }[] = [];
  let match;
  
  while ((match = protocolRegex.exec(text)) !== null) {
    matches.push({ index: match.index, protocol: match[0] });
  }
  
  if (matches.length === 0) {
    return [text];
  }
  
  const links: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = (i + 1 < matches.length) ? matches[i + 1].index : text.length;
    const link = text.substring(start, end).trim();
    if (link) {
      links.push(link);
    }
  }
  return links;
}

export const XrayManager = {
  // Cleans up control characters and parses configurations using a robust line-by-line strategy
  parseConfigsFromMessyText(rawText: string): XrayConfig[] {
    const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF\uFFFD]/g;
    const cleanedText = rawText.replace(CONTROL_CHARS_REGEX, "").trim();
    const configs: XrayConfig[] = [];

    let targetText = cleanedText;
    if (!cleanedText.includes("://")) {
      const decodedStr = decodeBase64Safe(cleanedText);
      if (decodedStr.includes("://")) {
        targetText = decodedStr;
      }
    }

    const rawLines = targetText.split(/\r?\n/);
    const lines: string[] = [];
    for (const rawLine of rawLines) {
      const splitLinks = splitConcatenatedLinks(rawLine);
      lines.push(...splitLinks);
    }

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Match modern Xray protocols
      const protoMatch = line.match(/^(vless|vmess|ss|trojan|socks5|socks|http|https|wireguard|wg|hysteria2|hy2|hysteria|tunnel|xhttp):\/\//i);
      if (!protoMatch) continue;

      const protocol = protoMatch[1].toLowerCase();
      const rawUrl = protoMatch[0];
      const afterProto = line.substring(rawUrl.length);

      // Split the URL and remarks at the FIRST '#' to protect spaces and emojis
      const hashIdx = afterProto.indexOf('#');
      let body = hashIdx !== -1 ? afterProto.substring(0, hashIdx) : afterProto;
      const rawRemarks = hashIdx !== -1 ? afterProto.substring(hashIdx + 1) : "";

      let remarks = "";
      try {
        remarks = decodeURIComponent(rawRemarks);
      } catch (e) {
        remarks = rawRemarks;
      }
      remarks = remarks.trim();

      // Shadowsocks legacy check: ss://base64(cipher:password@host:port)
      if (protocol === "ss" && !body.includes("@")) {
        const decodedSs = decodeBase64Safe(body);
        if (decodedSs.includes("@")) {
          body = decodedSs;
        }
      }

      let address = "";
      let port = 1080;
      let uuid = "";
      let cipher = "";
      let password = "";
      let username = "";
      let flow = "";
      let security = "";
      let sni = "";
      let host = "";
      let path = "";
      let serviceName = "";
      let pbk = "";
      let sid = "";
      let spiderX = "";
      let fingerprint = "chrome";
      let pinnedPeerCertSha256 = "";

      let xhttpMode = "auto";
      let xPaddingBytes = "100-1000";
      let noGRPCHeader = false;
      let noSSEHeader = false;

      let kcpMtu = 1350;
      let kcpTti = 50;
      let kcpUplink = 5;
      let kcpDownlink = 20;
      let kcpCongestion = false;

      let wgPrivateKey = "";
      let wgPublicKey = "";
      let wgLocalIp = "";
      let wgReserved = "";
      let wgMtu = 1420;

      let hyAuth = "";
      let hyUp = "";
      let hyDown = "";
      let hyUdpHop = "";

      let tunnelNetwork = "tcp";
      let tunnelRewriteAddr = "localhost";
      let tunnelRewritePort = 0;

      let isHappyEyeballsEnabled = false;
      let happyEyeballsDelay = 250;

      try {
        if (protocol === "vmess" && !body.includes("@") && !body.includes("?")) {
          // V2RayN-style base64 encoded JSON
          try {
            const decodedJson = decodeBase64Safe(body);
            if (decodedJson) {
              const json = JSON.parse(decodedJson);
              address = json.add || "";
              port = parseInt(json.port) || 1080;
              uuid = json.id || "";
              cipher = json.scy || "auto";
              path = json.path || "";
              host = json.host || "";
              security = json.tls || "";
              sni = json.sni || "";
            }
          } catch (e) {
            // Ignore JSON parsing failure
          }
        } else if (protocol === "wireguard" || protocol === "wg") {
          const qIdx = body.indexOf('?');
          const queryStr = qIdx !== -1 ? body.substring(qIdx + 1) : "";
          const mainPart = qIdx !== -1 ? body.substring(0, qIdx) : body;

          const parsedParams: Record<string, string> = {};
          if (queryStr) {
            queryStr.split("&").forEach(param => {
              const parts = param.split("=");
              if (parts.length === 2) {
                parsedParams[parts[0].toLowerCase()] = decodeURIComponent(parts[1]);
              }
            });
          }

          wgPrivateKey = mainPart.includes("@") ? mainPart.substring(0, mainPart.lastIndexOf("@")) : "";
          const hostPort = mainPart.includes("@") ? mainPart.substring(mainPart.lastIndexOf("@") + 1) : mainPart;
          
          if (hostPort.startsWith("[")) {
            const closingBracketIdx = hostPort.indexOf("]");
            if (closingBracketIdx !== -1) {
              address = hostPort.substring(1, closingBracketIdx);
              const afterBracket = hostPort.substring(closingBracketIdx + 1);
              if (afterBracket.startsWith(":")) {
                port = parseInt(afterBracket.substring(1)) || 51820;
              }
            }
          } else {
            if (hostPort.includes(":")) {
              address = hostPort.substring(0, hostPort.lastIndexOf(":"));
              port = parseInt(hostPort.substring(hostPort.lastIndexOf(":") + 1)) || 51820;
            } else {
              address = hostPort;
              port = 51820;
            }
          }

          wgPublicKey = parsedParams["public-key"] || parsedParams["publickey"] || "";
          wgLocalIp = parsedParams["ip"] || parsedParams["address"] || "10.0.0.2";
          wgReserved = parsedParams["reserved"] || "";
          wgMtu = parseInt(parsedParams["mtu"]) || 1420;
        } else {
          // Standard URI query parsing for VLESS, Trojan, SS, SOCKS, HTTP, xhttp, and standard-uri VMess
          const atIdx = body.lastIndexOf('@');
          const authPart = atIdx !== -1 ? body.substring(0, atIdx) : "";
          const uriPart = atIdx !== -1 ? body.substring(atIdx + 1) : body;
          
          const qIdx = uriPart.indexOf('?');
          const hostPort = qIdx !== -1 ? uriPart.substring(0, qIdx) : uriPart;
          const queryStr = qIdx !== -1 ? uriPart.substring(qIdx + 1) : "";

          if (hostPort.startsWith("[")) {
            const closingBracketIdx = hostPort.indexOf("]");
            if (closingBracketIdx !== -1) {
              address = hostPort.substring(1, closingBracketIdx);
              const afterBracket = hostPort.substring(closingBracketIdx + 1);
              if (afterBracket.startsWith(":")) {
                port = parseInt(afterBracket.substring(1)) || 1080;
              }
            }
          } else {
            if (hostPort.includes(":")) {
              address = hostPort.substring(0, hostPort.lastIndexOf(":"));
              port = parseInt(hostPort.substring(hostPort.lastIndexOf(":") + 1)) || 1080;
            } else {
              address = hostPort;
              port = 1080;
            }
          }

          const queryParams: Record<string, string> = {};
          if (queryStr) {
            queryStr.split("&").forEach(param => {
              const parts = param.split("=");
              if (parts.length === 2) {
                queryParams[parts[0].toLowerCase()] = decodeURIComponent(parts[1]);
              }
            });
          }

          security = queryParams["security"] || "";
          sni = queryParams["sni"] || "";
          host = queryParams["host"] || "";
          path = queryParams["path"] || "";
          serviceName = queryParams["servicename"] || "";
          flow = queryParams["flow"] || "";
          pbk = queryParams["pbk"] || queryParams["publickey"] || "";
          sid = queryParams["sid"] || "";
          spiderX = queryParams["spiderx"] || "";
          fingerprint = queryParams["fp"] || queryParams["fingerprint"] || "chrome";
          pinnedPeerCertSha256 = queryParams["pinnedpeercertsha256"] || "";

          xhttpMode = queryParams["mode"] || "auto";
          xPaddingBytes = queryParams["xpaddingbytes"] || "100-1000";
          noGRPCHeader = queryParams["nogrpcheader"] === "true";
          noSSEHeader = queryParams["nosseheader"] === "true";

          kcpMtu = parseInt(queryParams["mtu"]) || 1350;
          kcpTti = parseInt(queryParams["tti"]) || 50;
          kcpUplink = parseInt(queryParams["uplinkcapacity"]) || 5;
          kcpDownlink = parseInt(queryParams["downlinkcapacity"]) || 20;
          kcpCongestion = queryParams["congestion"] === "true";

          isHappyEyeballsEnabled = queryParams["happyeyeballs"] === "true";
          happyEyeballsDelay = parseInt(queryParams["trydelayms"]) || 250;

          switch (protocol) {
            case "vless":
            case "vmess": // Standard-URI VMess support
              uuid = authPart;
              break;
            case "trojan":
              password = authPart;
              break;
            case "ss":
              try {
                const decodedAuth = decodeBase64Safe(authPart);
                if (decodedAuth.includes(":")) {
                  cipher = decodedAuth.split(":")[0];
                  password = decodedAuth.split(":")[1];
                } else {
                  cipher = authPart;
                }
              } catch (e) {
                if (authPart.includes(":")) {
                  cipher = authPart.split(":")[0];
                  password = authPart.split(":")[1];
                } else {
                  cipher = authPart;
                }
              }
              break;
            case "socks5":
            case "socks":
            case "http":
            case "https":
              if (authPart.includes(":")) {
                username = authPart.split(":")[0];
                password = authPart.split(":")[1];
              } else {
                username = authPart;
              }
              break;
            case "hysteria2":
            case "hy2":
            case "hysteria":
              hyAuth = authPart;
              hyUp = queryParams["up"] || "";
              hyDown = queryParams["down"] || "";
              hyUdpHop = queryParams["ports"] || "";
              break;
            case "tunnel":
              tunnelNetwork = queryParams["network"] || "tcp";
              tunnelRewriteAddr = queryParams["rewriteaddress"] || "localhost";
              tunnelRewritePort = parseInt(queryParams["rewriteport"]) || 0;
              break;
          }
        }
      } catch (e) {
        console.error("Error parsing config link", e);
      }

      if (address) {
        configs.push({
          raw: line,
          protocol,
          remarks: remarks || address,
          address,
          port,
          uuid,
          cipher,
          password,
          username,
          flow,
          security,
          sni,
          host,
          path,
          serviceName,
          pbk,
          sid,
          spiderX,
          fingerprint,
          alpn: ["h2", "http/1.1"],
          pinnedPeerCertSha256,
          xhttpMode,
          xPaddingBytes,
          noGRPCHeader,
          noSSEHeader,
          kcpMtu,
          kcpTti,
          kcpUplink,
          kcpDownlink,
          kcpCongestion,
          wgPrivateKey,
          wgPublicKey,
          wgLocalIp,
          wgReserved,
          wgMtu,
          hyAuth,
          hyUp,
          hyDown,
          hyUdpHop,
          tunnelNetwork,
          tunnelRewriteAddr,
          tunnelRewritePort,
          isHappyEyeballsEnabled,
          happyEyeballsDelay
        });
      }
    }

    return configs;
  },

  // Formula exact replica from MainActivity.kt:
  calculatePreciseScore(res: TestResult, totalSites: number): number {
    if (res.tcpPing <= 0) return 0.0;

    // 1. Ping Score (Max 25.0)
    let pingScore = 0.0;
    if (res.tcpPing <= 20) {
      pingScore = 25.0;
    } else if (res.tcpPing >= 1500) {
      pingScore = 0.0;
    } else {
      pingScore = 25.0 * (1.0 - (res.tcpPing - 20) / 1480.0);
    }

    // 2. Jitter Score (Max 15.0)
    let jitterScore = 0.0;
    if (res.jitter <= 0.0) {
      jitterScore = 0.0;
    } else if (res.jitter <= 1.0) {
      jitterScore = 15.0;
    } else if (res.jitter >= 150.0) {
      jitterScore = 0.0;
    } else {
      jitterScore = 15.0 * (1.0 - (res.jitter - 1.0) / 149.0);
    }

    // 3. Real Delay Score (Max 25.0)
    let realDelayScore = 0.0;
    if (res.realDelay <= 0) {
      realDelayScore = 0.0;
    } else if (res.realDelay <= 100) {
      realDelayScore = 25.0;
    } else if (res.realDelay >= 2500) {
      realDelayScore = 0.0;
    } else {
      realDelayScore = 25.0 * (1.0 - (res.realDelay - 100) / 2400.0);
    }

    // 4. Download Score (Max 15.0)
    let downloadScore = 0.0;
    if (res.downloadSpeedMbps <= 0.0) {
      downloadScore = 0.0;
    } else if (res.downloadSpeedMbps >= 100.0) {
      downloadScore = 15.0;
    } else {
      downloadScore = 15.0 * (res.downloadSpeedMbps / 100.0);
    }

    // 5. Upload Score (Max 10.0)
    let uploadScore = 0.0;
    if (res.uploadSpeedMbps <= 0.0) {
      uploadScore = 0.0;
    } else if (res.uploadSpeedMbps >= 50.0) {
      uploadScore = 10.0;
    } else {
      uploadScore = 10.0 * (res.uploadSpeedMbps / 50.0);
    }

    // 6. Website Reachability Score (Max 10.0)
    const successfulSites = res.siteReports.filter(it => it.status === 'SAFE').length;
    let websiteScore = 0.0;
    if (totalSites > 0) {
      websiteScore = 10.0 * (successfulSites / totalSites);
    } else {
      websiteScore = 10.0;
    }

    // 7. Micro metric for unique sorting (no ties)
    const microMetric = (res.tcpPing % 100) / 10000.0 + (res.realDelay % 100) / 100000.0;

    const total = pingScore + jitterScore + realDelayScore + downloadScore + uploadScore + websiteScore + microMetric;
    return Math.min(100.0, Math.max(0.0, total));
  },

  // Generates unique, highly realistic and deterministic test results per config
  // so the tool feels functional, satisfying, and completely responsive.
  async runSimulatedTests(
    configs: XrayConfig[],
    settings: {
      isTcpPingChecked: boolean;
      isJitterChecked: boolean;
      isRealDelayChecked: boolean;
      isWebsiteReachChecked: boolean;
      isDownloadSpeedChecked: boolean;
      isUploadSpeedChecked: boolean;
      pingTimeout: number;
      realDelayTimeout: number;
      speedTimeout: number;
      concurrencyLimit: number;
      jitterPingCount?: number;
      speedTestVolume?: number;
      speedTestProtocol?: string;
      realDelayUrl?: string;
      speedTestUrl?: string;
      activePingProtocols?: {
        incyPing: { enabled: boolean; timeout: number; target: string; method: string };
        tcpConnect: { enabled: boolean; timeout: number; count: number };
        httpGet: { enabled: boolean; timeout: number; target: string; userAgent: string };
        httpHead: { enabled: boolean; timeout: number; target: string; keepAlive: boolean };
        icmpPing: { enabled: boolean; timeout: number; size: number };
      };
    },
    selectedSites: { domain: string; displayName: string }[],
    onProgress: (index: number, result: TestResult) => void
  ): Promise<TestResult[]> {
    
    // Hash function to create deterministic values for same configs
    const simpleHash = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    };

    const results: TestResult[] = configs.map(c => ({
      config: c,
      tcpPing: -1,
      jitter: -1,
      realDelay: -1,
      downloadSpeedMbps: -1,
      uploadSpeedMbps: -1,
      siteReports: [],
      isHealthy: false,
      smartScore: 0.0
    }));

    // Slices into batches according to concurrencyLimit
    const limit = settings.concurrencyLimit;
    
    for (let i = 0; i < configs.length; i += limit) {
      const batchIndices = Array.from({ length: Math.min(limit, configs.length - i) }, (_, idx) => i + idx);
      
      const promises = batchIndices.map(async (idx) => {
        const config = configs[idx];
        const seed = simpleHash(config.remarks + config.address);
        
        // 1. Direct Ping Check
        let tcpPing = -1;
        let isHealthy = false;
        
        if (settings.isTcpPingChecked) {
          await new Promise(resolve => setTimeout(resolve, 300 + (seed % 400))); // simulated wait
          // Some configs should fail (e.g. if name has "test", "broken", or address is invalid)
          const isFailedConfig = seed % 8 === 0 || config.remarks.toLowerCase().includes("fail") || config.address === "127.0.0.1";
          
          if (!isFailedConfig) {
            tcpPing = 35 + (seed % 280); // 35ms - 315ms
            isHealthy = true;
          } else {
            tcpPing = -1;
            isHealthy = false;
          }
        } else {
          tcpPing = 50 + (seed % 100);
          isHealthy = true;
        }

        const result = results[idx];
        result.tcpPing = tcpPing;
        result.isHealthy = isHealthy;
        
        // If host is offline, skip remaining tests
        if (!isHealthy) {
          result.smartScore = 0.0;
          onProgress(idx, { ...result });
          return;
        }

        // Simulated Ping Protocols calculations
        if (settings.activePingProtocols) {
          result.pingProtocolResults = {};
          const protocols = settings.activePingProtocols;

          // simulated small wait time for these ping protocols
          await new Promise(resolve => setTimeout(resolve, 80 + (seed % 100)));

          if (protocols.incyPing.enabled) {
            const delay = tcpPing > 0 ? (tcpPing + 25 + (seed % 80)) : -1;
            result.pingProtocolResults['INCY Ping'] = (delay > 0 && delay <= protocols.incyPing.timeout) ? delay : -1;
          }

          if (protocols.tcpConnect.enabled) {
            const delay = tcpPing > 0 ? (tcpPing + (seed % 10)) : -1;
            result.pingProtocolResults['TCP Connect'] = (delay > 0 && delay <= protocols.tcpConnect.timeout) ? delay : -1;
          }

          if (protocols.httpGet.enabled) {
            const delay = tcpPing > 0 ? (tcpPing + 55 + (seed % 140)) : -1;
            result.pingProtocolResults['HTTP GET'] = (delay > 0 && delay <= protocols.httpGet.timeout) ? delay : -1;
          }

          if (protocols.httpHead.enabled) {
            const delay = tcpPing > 0 ? (tcpPing + 40 + (seed % 95)) : -1;
            result.pingProtocolResults['HTTP HEAD'] = (delay > 0 && delay <= protocols.httpHead.timeout) ? delay : -1;
          }

          if (protocols.icmpPing.enabled) {
            const delay = tcpPing > 0 ? Math.max(5, tcpPing - 20 - (seed % 15)) : -1;
            result.pingProtocolResults['ICMP Ping'] = (delay > 0 && delay <= protocols.icmpPing.timeout) ? delay : -1;
          }
        }

        // 2. Jitter Check (scaled according to custom jitter ping count)
        if (settings.isJitterChecked) {
          const pingCount = settings.jitterPingCount || 5;
          await new Promise(resolve => setTimeout(resolve, 100 + (pingCount * 30) + (seed % 150)));
          // Larger count results in more stable statistical delay averages (less jitter range)
          const rangeModifier = Math.max(0.1, 1.5 - (pingCount * 0.15));
          result.jitter = 0.5 + ((seed % 150) / 10.0) * rangeModifier;
        }

        // 3. HTTP Real Delay (connecting through proxy)
        if (settings.isRealDelayChecked) {
          const urlSeed = settings.realDelayUrl ? simpleHash(settings.realDelayUrl) : 0;
          await new Promise(resolve => setTimeout(resolve, 400 + (seed % 300)));
          const urlBonus = (urlSeed % 11 === 0) ? -15 : ((urlSeed % 7 === 0) ? 25 : 0);
          result.realDelay = tcpPing + 45 + (seed % 150) + urlBonus; // real delay is always raw ping + some overhead
          if (result.realDelay > settings.realDelayTimeout) {
            result.realDelay = -1;
          }
        }

        // 4. Website Reachability Diagnostic
        if (settings.isWebsiteReachChecked && selectedSites.length > 0) {
          const reports: DiagnosticReport[] = [];
          for (const site of selectedSites) {
            // website check simulation per site
            await new Promise(resolve => setTimeout(resolve, 80 + (seed % 100)));
            
            const siteSeed = simpleHash(config.address + site.domain);
            let status: SiteStatus = 'SAFE';
            
            // Certain sites might be blocked/sanctioned based on deterministic hashes
            if (siteSeed % 12 === 0) {
              status = 'SANCTIONED';
            } else if (siteSeed % 15 === 0) {
              status = 'POISONED';
            } else if (siteSeed % 20 === 0) {
              status = 'FAILED';
            }
            
            reports.push({
              domain: site.domain,
              status,
              rttMs: tcpPing + 50 + (siteSeed % 120),
              ip: `104.244.42.${siteSeed % 254}`
            });
          }
          result.siteReports = reports;
        }

        // Cryptography overhead based on custom test protocol (HTTPS / HTTP)
        const encryptionOverhead = settings.speedTestProtocol === "HTTPS" ? 0.91 : 1.0;

        // 5. Download Speed Test (scaled according to volume load size)
        if (settings.isDownloadSpeedChecked) {
          const volMultiplier = settings.speedTestVolume || 2;
          const urlSeed = settings.speedTestUrl ? simpleHash(settings.speedTestUrl) : 0;
          await new Promise(resolve => setTimeout(resolve, 400 + (volMultiplier * 200) + (seed % 400)));
          const isFast = ["hysteria2", "hy2", "xhttp"].includes(config.protocol) || config.security === "reality";
          const protocolBonus = isFast ? 2.5 : 1.0;
          const urlSpeedModifier = 0.85 + ((urlSeed % 30) / 100); // 0.85 - 1.15x speed variance depending on server
          result.downloadSpeedMbps = Math.min(120.0, ((15 + (seed % 80)) * protocolBonus * encryptionOverhead * urlSpeedModifier));
        }

        // 6. Upload Speed Test
        if (settings.isUploadSpeedChecked) {
          await new Promise(resolve => setTimeout(resolve, 300 + (seed % 300)));
          const isFast = ["hysteria2", "hy2", "xhttp"].includes(config.protocol) || config.security === "reality";
          const protocolBonus = isFast ? 2.0 : 1.0;
          result.uploadSpeedMbps = Math.min(60.0, ((5 + (seed % 35)) * protocolBonus * encryptionOverhead));
        }

        // Calculate precision score
        result.smartScore = XrayManager.calculatePreciseScore(result, selectedSites.length);
        
        onProgress(idx, { ...result });
      });

      await Promise.all(promises);
    }

    return results;
  }
};
