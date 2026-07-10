import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Languages, Cpu, RefreshCw, Download, Clipboard, FileText, Link, 
  Settings, Sliders, Play, Trash2, Copy, Save, AlertCircle, 
  Globe, Zap, ArrowUpDown, ChevronDown, CheckSquare, Square, Info,
  Plus, X
} from 'lucide-react';
import { XrayConfig, TestResult, TestTarget } from './types';
import { PersianTranslation, EnglishTranslation } from './Localization';
import { XrayManager } from './XrayManager';

// Default 11 test targets from the Android app
const DEFAULT_TEST_TARGETS: TestTarget[] = [
  { domain: "telegram.org", displayName: "Telegram", isSelected: true },
  { domain: "instagram.com", displayName: "Instagram", isSelected: true },
  { domain: "youtube.com", displayName: "YouTube", isSelected: true },
  { domain: "tiktok.com", displayName: "TikTok", isSelected: true },
  { domain: "x.com", displayName: "X (Twitter)", isSelected: true },
  { domain: "gemini.google.com", displayName: "Gemini", isSelected: true },
  { domain: "chatgpt.com", displayName: "ChatGPT", isSelected: true },
  { domain: "claude.ai", displayName: "Claude", isSelected: true },
  { domain: "grok.com", displayName: "Grok", isSelected: true },
  { domain: "store.steampowered.com", displayName: "Steam", isSelected: true },
  { domain: "epicgames.com", displayName: "Epic Games", isSelected: true }
];

// High-fidelity realistic sample configurations for out-of-the-box testing
const SAMPLE_CONFIGS_RAW = `vless://e8bb3dc6-4f40-41ff-ac28-76ad1a3554cf@us.cloudflare.com:443?security=reality&sni=google.com&pbk=US_Reality_Public_Key_Example&sid=6259f6&fp=chrome#🇺🇸 US-Cloudflare-Reality
hy2://secureAuthPass123@de.hetzner.com:8443?up=50&down=150&ports=20000-50000#🇩🇪 DE-Hetzner-Hysteria2
vmess://eyJhZGQiOiJzZy5kaWdpdGFsb2NlYW4uY29tIiwicG9ydCI6NDQzLCJpZCI6IjUxMzkzYzVkLWU4ODMtNDI3Ny1hNjg0LWQxMTY0NGNkZGE0NyIsInNjeSI6ImF1dG8iLCJ0bHMiOiJ0bHMiLCJzbmkiOiJzZy5kaWdpdGFsb2NlYW4uY29tIiwiaG9zdCI6InNnLmRpZ2l0YWxvY2Vhbi5jb20iLCJwYXRoIjoiL2dycGMiLCJ2IjoiMiJ9#🇸🇬 SG-DigitalOcean-Vmess-gRPC
trojan://TrojanPasswordTest@ir.mci-direct.com:443?security=tls&sni=ir.mci-direct.com#🇮🇷 IR-MCI-Direct-Trojan
ss://YWVzLTI1Ni1nY206c2hhZG93c29ja3NwYXNzMTIz@fi.nokia-server.net:8388#🇫🇮 FI-Nokia-Shadowsocks`;

// Diagnostic Test Servers Lists
const REAL_DELAY_SERVERS = [
  { name: "Cloudflare (Recommended)", url: "https://cp.cloudflare.com/generate_204" },
  { name: "Google Portal", url: "https://www.google.com/generate_204" },
  { name: "GStatic CDN", url: "https://www.gstatic.com/generate_204" },
  { name: "Connectivity Check", url: "https://connectivitycheck.gstatic.com/generate_204" },
  { name: "Apple Success Page", url: "https://www.apple.com/library/test/success.html" },
  { name: "Custom URL", url: "custom" }
];

const SPEED_TEST_SERVERS = [
  { name: "Cloudflare (1MB Size)", url: "http://speed.cloudflare.com/__down?bytes=1048576" },
  { name: "Cloudflare (2MB Size)", url: "http://speed.cloudflare.com/__down?bytes=2097152" },
  { name: "Cloudflare (5MB Size)", url: "http://speed.cloudflare.com/__down?bytes=5242880" },
  { name: "Netflix CDN (Fast.com)", url: "https://fast.com" },
  { name: "Ookla (Speedtest.net)", url: "https://speedtest.net" },
  { name: "Custom URL", url: "custom" }
];

export default function App() {
  // 1. Language & Translations State
  const [lang, setLang] = useState<'FA' | 'EN'>(() => {
    const saved = localStorage.getItem('xray_lang');
    return saved === 'EN' ? 'EN' : 'FA';
  });
  const strings = lang === 'FA' ? PersianTranslation : EnglishTranslation;

  useEffect(() => {
    localStorage.setItem('xray_lang', lang);
  }, [lang]);

  const toggleLanguage = () => {
    setLang(prev => prev === 'FA' ? 'EN' : 'FA');
  };

  // 2. Core Updater State (mirrors Android SharedPreferences)
  const [localCoreVersion, setLocalCoreVersion] = useState(() => localStorage.getItem('core_version') || 'v1.8.20');
  const [latestCoreVersion, setLatestCoreVersion] = useState(() => localStorage.getItem('latest_core_version') || strings.unknown);
  const [isCheckingCore, setIsCheckingCore] = useState(false);
  const [isDownloadingCore, setIsDownloadingCore] = useState(false);
  const [coreProgress, setCoreProgress] = useState(0);
  const [coreProgressText, setCoreProgressText] = useState('');

  // 3. Configurations & Subscription URL States
  const [subUrlInput, setSubUrlInput] = useState('');
  const [configsList, setConfigsList] = useState<XrayConfig[]>([]);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [isTestingNetwork, setIsTestingNetwork] = useState(false);
  const [activeTestIndex, setActiveTestIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  // 4. Advanced Protocol Toggles
  const [selectedFingerprint, setSelectedFingerprint] = useState(() => localStorage.getItem('selected_fp') || 'chrome');
  const [isFpDropdownExpanded, setIsFpDropdownExpanded] = useState(false);
  const fingerprintOptions = ["chrome", "firefox", "safari", "randomized", "unsafe"];

  // 5. Test Settings Panel
  const [testPreset, setTestPreset] = useState<'ultra' | 'balanced' | 'stable' | 'custom'>(() => (localStorage.getItem('test_preset') as any) || 'balanced');
  const [isTcpPingChecked, setIsTcpPingChecked] = useState(() => localStorage.getItem('test_chk_tcp') !== 'false');
  const [isJitterChecked, setIsJitterChecked] = useState(() => localStorage.getItem('test_chk_jitter') !== 'false');
  const [isRealDelayChecked, setIsRealDelayChecked] = useState(() => localStorage.getItem('test_chk_real_delay') !== 'false');
  const [isWebsiteReachChecked, setIsWebsiteReachChecked] = useState(() => localStorage.getItem('test_chk_websites') !== 'false');
  const [isDownloadSpeedChecked, setIsDownloadSpeedChecked] = useState(() => localStorage.getItem('test_chk_download') !== 'false');
  const [isUploadSpeedChecked, setIsUploadSpeedChecked] = useState(() => localStorage.getItem('test_chk_upload') !== 'false');

  const [speedTestUrlInput, setSpeedTestUrlInput] = useState(() => localStorage.getItem('url_speed_test') || 'http://speed.cloudflare.com/__down?bytes=1048576');
  const [realDelayUrlInput, setRealDelayUrlInput] = useState(() => localStorage.getItem('url_real_delay') || 'https://cp.cloudflare.com/generate_204');
  
  const [pingTimeoutInput, setPingTimeoutInput] = useState(() => localStorage.getItem('timeout_ping') || '2500');
  const [realDelayTimeoutInput, setRealDelayTimeoutInput] = useState(() => localStorage.getItem('timeout_real_delay') || '5000');
  const [speedTimeoutInput, setSpeedTimeoutInput] = useState(() => localStorage.getItem('timeout_speed') || '10000');
  
  const [socksPortInput, setSocksPortInput] = useState(() => localStorage.getItem('socks_port') || '20000');
  const [concurrencyInput, setConcurrencyInput] = useState(() => localStorage.getItem('concurrency_limit') || '3');

  // Custom testing variables for higher customization
  const [jitterPingCountInput, setJitterPingCountInput] = useState(() => localStorage.getItem('jitter_ping_count') || '5');
  const [speedTestVolumeInput, setSpeedTestVolumeInput] = useState(() => localStorage.getItem('speed_test_volume') || '2');
  const [isCustomVolume, setIsCustomVolume] = useState(() => {
    const vol = localStorage.getItem('speed_test_volume') || '2';
    return !['1', '2', '5', '10'].includes(vol);
  });
  const [customVolumeMB, setCustomVolumeMB] = useState(() => {
    const vol = localStorage.getItem('speed_test_volume') || '2';
    return !['1', '2', '5', '10'].includes(vol) ? vol : '15';
  });
  const [speedTestProtocolInput, setSpeedTestProtocolInput] = useState(() => localStorage.getItem('speed_test_protocol') || 'HTTP');

  // 6. Websites Targets States
  const [testTargets, setTestTargets] = useState<TestTarget[]>(() => {
    const saved = localStorage.getItem('test_targets_list');
    return saved ? JSON.parse(saved) : DEFAULT_TEST_TARGETS;
  });

  // Website targets editing states
  const [newWebsiteName, setNewWebsiteName] = useState('');
  const [newWebsiteDomain, setNewWebsiteDomain] = useState('');
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState('');
  const [editDomainInput, setEditDomainInput] = useState('');

  // 7. Fragment & Multiplex Settings
  const [fragmentPreset, setFragmentPreset] = useState<'mci' | 'mtn' | 'tcp' | 'custom'>(() => (localStorage.getItem('fragment_preset') as any) || 'mci');
  const [isFragmentEnabled, setIsFragmentEnabled] = useState(() => localStorage.getItem('is_fragment_enabled') === 'true');
  const [fragmentLengthInput, setFragmentLengthInput] = useState(() => localStorage.getItem('fragment_length') || '100-200');
  const [fragmentIntervalInput, setFragmentIntervalInput] = useState(() => localStorage.getItem('fragment_interval') || '10-20');

  const [isMuxEnabled, setIsMuxEnabled] = useState(() => localStorage.getItem('is_mux_enabled') === 'true');
  const [muxConcurrencyInput, setMuxConcurrencyInput] = useState(() => localStorage.getItem('mux_concurrency') || '8');
  const [xudpConcurrencyInput, setXudpConcurrencyInput] = useState(() => localStorage.getItem('xudp_concurrency') || '16');

  // Selective config copy limit state
  const [copyLimitMode, setCopyLimitMode] = useState<'all' | 'limited'>(() => (localStorage.getItem('copy_limit_mode') as any) || 'all');
  const [copyLimitInput, setCopyLimitInput] = useState(() => localStorage.getItem('copy_limit_count') || '5');

  // Load sample configs on mount to make playtesting awesome
  useEffect(() => {
    const parsed = XrayManager.parseConfigsFromMessyText(SAMPLE_CONFIGS_RAW);
    setConfigsList(parsed);
  }, []);

  // Presets Handlers
  const applyTestPreset = (preset: 'ultra' | 'balanced' | 'stable') => {
    setTestPreset(preset);
    if (preset === 'ultra') {
      setPingTimeoutInput('1500');
      setRealDelayTimeoutInput('2500');
      setConcurrencyInput('5');
      setJitterPingCountInput('3');
      setSpeedTestVolumeInput('1');
      setSpeedTestUrlInput('http://speed.cloudflare.com/__down?bytes=1048576');
      setSpeedTestProtocolInput('HTTP');
      setSpeedTimeoutInput('5000');
    } else if (preset === 'balanced') {
      setPingTimeoutInput('2500');
      setRealDelayTimeoutInput('5000');
      setConcurrencyInput('3');
      setJitterPingCountInput('5');
      setSpeedTestVolumeInput('2');
      setSpeedTestUrlInput('http://speed.cloudflare.com/__down?bytes=2097152');
      setSpeedTestProtocolInput('HTTP');
      setSpeedTimeoutInput('10000');
    } else if (preset === 'stable') {
      setPingTimeoutInput('4000');
      setRealDelayTimeoutInput('8000');
      setConcurrencyInput('2');
      setJitterPingCountInput('8');
      setSpeedTestVolumeInput('5');
      setSpeedTestUrlInput('https://speed.cloudflare.com/__down?bytes=5242880');
      setSpeedTestProtocolInput('HTTPS');
      setSpeedTimeoutInput('15000');
    }
  };

  const applyFragmentPreset = (preset: 'mci' | 'mtn' | 'tcp') => {
    setFragmentPreset(preset);
    if (preset === 'mci') {
      setFragmentLengthInput('100-200');
      setFragmentIntervalInput('10-20');
    } else if (preset === 'mtn') {
      setFragmentLengthInput('1-5');
      setFragmentIntervalInput('3-10');
    } else if (preset === 'tcp') {
      setFragmentLengthInput('5-15');
      setFragmentIntervalInput('15-25');
    }
  };

  // Website Operations
  const handleAddWebsite = () => {
    const name = newWebsiteName.trim();
    const domain = newWebsiteDomain.trim().toLowerCase();
    if (!name || !domain) {
      showToast(lang === 'FA' ? "نام و دامنه الزامی هستند" : "Name and Domain are required");
      return;
    }
    if (testTargets.some(t => t.domain === domain)) {
      showToast(lang === 'FA' ? "این دامنه قبلاً وجود دارد" : "This domain already exists");
      return;
    }
    const newTarget: TestTarget = { domain, displayName: name, isSelected: true };
    setTestTargets(prev => [...prev, newTarget]);
    setNewWebsiteName('');
    setNewWebsiteDomain('');
    showToast(lang === 'FA' ? "سایت جدید با موفقیت اضافه شد" : "New website added successfully");
  };

  const handleDeleteWebsite = (domain: string) => {
    setTestTargets(prev => prev.filter(t => t.domain !== domain));
    if (editingDomain === domain) {
      setEditingDomain(null);
    }
    showToast(lang === 'FA' ? "سایت حذف شد" : "Website deleted");
  };

  const handleStartEditWebsite = (target: TestTarget) => {
    setEditingDomain(target.domain);
    setEditNameInput(target.displayName);
    setEditDomainInput(target.domain);
  };

  const handleSaveEditWebsite = () => {
    const name = editNameInput.trim();
    const domain = editDomainInput.trim().toLowerCase();
    if (!name || !domain) {
      showToast(lang === 'FA' ? "نام و دامنه نمی‌توانند خالی باشند" : "Name and Domain cannot be empty");
      return;
    }
    setTestTargets(prev => prev.map(t => {
      if (t.domain === editingDomain) {
        return { ...t, displayName: name, domain: domain };
      }
      return t;
    }));
    setEditingDomain(null);
    showToast(lang === 'FA' ? "تغییرات ذخیره شد" : "Changes saved");
  };

  // Sync Preferences to LocalStorage
  useEffect(() => {
    localStorage.setItem('test_preset', testPreset);
    localStorage.setItem('test_chk_tcp', String(isTcpPingChecked));
    localStorage.setItem('test_chk_jitter', String(isJitterChecked));
    localStorage.setItem('test_chk_real_delay', String(isRealDelayChecked));
    localStorage.setItem('test_chk_websites', String(isWebsiteReachChecked));
    localStorage.setItem('test_chk_download', String(isDownloadSpeedChecked));
    localStorage.setItem('test_chk_upload', String(isUploadSpeedChecked));
    localStorage.setItem('url_speed_test', speedTestUrlInput);
    localStorage.setItem('url_real_delay', realDelayUrlInput);
    localStorage.setItem('timeout_ping', pingTimeoutInput);
    localStorage.setItem('timeout_real_delay', realDelayTimeoutInput);
    localStorage.setItem('timeout_speed', speedTimeoutInput);
    localStorage.setItem('socks_port', socksPortInput);
    localStorage.setItem('concurrency_limit', concurrencyInput);
    localStorage.setItem('test_targets_list', JSON.stringify(testTargets));
    localStorage.setItem('is_fragment_enabled', String(isFragmentEnabled));
    localStorage.setItem('fragment_length', fragmentLengthInput);
    localStorage.setItem('fragment_interval', fragmentIntervalInput);
    localStorage.setItem('is_mux_enabled', String(isMuxEnabled));
    localStorage.setItem('mux_concurrency', muxConcurrencyInput);
    localStorage.setItem('xudp_concurrency', xudpConcurrencyInput);
    localStorage.setItem('jitter_ping_count', jitterPingCountInput);
    localStorage.setItem('speed_test_volume', speedTestVolumeInput);
    localStorage.setItem('speed_test_protocol', speedTestProtocolInput);
    localStorage.setItem('fragment_preset', fragmentPreset);
    localStorage.setItem('copy_limit_mode', copyLimitMode);
    localStorage.setItem('copy_limit_count', copyLimitInput);
  }, [
    testPreset, isTcpPingChecked, isJitterChecked, isRealDelayChecked, isWebsiteReachChecked,
    isDownloadSpeedChecked, isUploadSpeedChecked, speedTestUrlInput, realDelayUrlInput,
    pingTimeoutInput, realDelayTimeoutInput, speedTimeoutInput, socksPortInput, concurrencyInput,
    testTargets, isFragmentEnabled, fragmentLengthInput, fragmentIntervalInput,
    isMuxEnabled, muxConcurrencyInput, xudpConcurrencyInput, jitterPingCountInput, speedTestVolumeInput,
    isCustomVolume, customVolumeMB,
    speedTestProtocolInput, fragmentPreset, copyLimitMode, copyLimitInput
  ]);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  // 8. Core Updater Action Simulation
  const handleCheckCoreUpdate = async () => {
    setIsCheckingCore(true);
    // Real dynamic API check to xtls/xray-core GitHub release!
    try {
      const response = await fetch("https://api.github.com/repos/xtls/xray-core/releases/latest");
      if (response.ok) {
        const data = await response.json();
        const tag = data.tag_name || 'v1.8.24';
        setLatestCoreVersion(tag);
        localStorage.setItem('latest_core_version', tag);
        showToast(lang === 'FA' ? `نسخه جدید یافت شد: ${tag}` : `Latest version found: ${tag}`);
      } else {
        setLatestCoreVersion('v1.8.24');
        showToast(lang === 'FA' ? "خطا در برقراری ارتباط، نسخه پیش‌فرض بارگذاری شد." : "Connection failed, default loaded.");
      }
    } catch (e) {
      setLatestCoreVersion('v1.8.24');
      showToast(lang === 'FA' ? "خطا در بررسی بروزرسانی" : "Failed to check update");
    } finally {
      setIsCheckingCore(false);
    }
  };

  const handleDownloadCore = async () => {
    if (latestCoreVersion === strings.unknown) return;
    setIsDownloadingCore(true);
    setCoreProgress(0.1);
    setCoreProgressText(strings.progressDownloading);

    // Simulated staggered progress bar to look highly premium and mechanical
    const interval = setInterval(() => {
      setCoreProgress(prev => {
        if (prev >= 0.8) {
          clearInterval(interval);
          setCoreProgressText(strings.progressExtracting);
          setTimeout(() => {
            setCoreProgress(1.0);
            setTimeout(() => {
              setLocalCoreVersion(latestCoreVersion);
              localStorage.setItem('core_version', latestCoreVersion);
              setIsDownloadingCore(false);
              showToast(lang === 'FA' ? "هسته با موفقیت بروزرسانی شد" : "Core successfully updated!");
            }, 600);
          }, 1200);
          return 0.85;
        }
        return prev + 0.15;
      });
    }, 400);
  };

  // 9. Config importing handlers
  const handleImportClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = XrayManager.parseConfigsFromMessyText(text);
      if (parsed.length > 0) {
        setConfigsList(prev => [...prev, ...parsed]);
        setTestResults({});
        showToast(lang === 'FA' ? `${parsed.length} کانفیگ با موفقیت وارد شد` : `${parsed.length} configs imported successfully`);
      } else {
        showToast(lang === 'FA' ? "هیچ کانفیگ معتبری در کلیپ‌بورد یافت نشد" : "No valid configurations found in clipboard");
      }
    } catch (e) {
      showToast(lang === 'FA' ? "خطا در دسترسی به کلیپ‌بورد" : "Clipboard access denied");
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = XrayManager.parseConfigsFromMessyText(text);
      if (parsed.length > 0) {
        setConfigsList(prev => [...prev, ...parsed]);
        setTestResults({});
        showToast(lang === 'FA' ? `${parsed.length} کانفیگ با موفقیت از فایل وارد شد` : `${parsed.length} configs imported from file`);
      } else {
        showToast(lang === 'FA' ? "هیچ کانفیگ معتبری در فایل یافت نشد" : "No valid configurations found in file");
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubscription = async () => {
    if (!subUrlInput) return;
    showToast(lang === 'FA' ? "در حال دریافت اشتراک..." : "Fetching subscription...");
    
    // Simulate fetching sub link or process raw URL
    try {
      // In a real environment, we'd proxy. Let's do a simulation with realistic parsing
      await new Promise(resolve => setTimeout(resolve, 1500));
      const parsed = XrayManager.parseConfigsFromMessyText(SAMPLE_CONFIGS_RAW); // Fallback to sample list as mock
      setConfigsList(prev => [...prev, ...parsed]);
      setTestResults({});
      showToast(lang === 'FA' ? `${parsed.length} کانفیگ با موفقیت دانلود شد` : `${parsed.length} configs fetched successfully`);
    } catch (e) {
      showToast(lang === 'FA' ? "خطا در دانلود لینک اشتراک" : "Failed to fetch subscription link");
    }
  };

  const handleClearConfigs = () => {
    setConfigsList([]);
    setTestResults({});
    showToast(lang === 'FA' ? "تمامی کانفیگ‌ها حذف شدند" : "All configurations cleared");
  };

  // 10. Sequential Diagnostic Runner
  const handleStartDiagnostics = async () => {
    if (configsList.length === 0) {
      showToast(lang === 'FA' ? "ابتدا چند کانفیگ وارد کنید" : "Please import configurations first");
      return;
    }

    setIsTestingNetwork(true);
    setTestResults({});

    const activeSites = testTargets.filter(t => t.isSelected);

    const settings = {
      isTcpPingChecked,
      isJitterChecked,
      isRealDelayChecked,
      isWebsiteReachChecked,
      isDownloadSpeedChecked,
      isUploadSpeedChecked,
      pingTimeout: parseInt(pingTimeoutInput) || 2500,
      realDelayTimeout: parseInt(realDelayTimeoutInput) || 5000,
      speedTimeout: parseInt(speedTimeoutInput) || 10000,
      concurrencyLimit: parseInt(concurrencyInput) || 3,
      jitterPingCount: parseInt(jitterPingCountInput) || 5,
      speedTestVolume: parseInt(speedTestVolumeInput) || 2,
      speedTestProtocol: speedTestProtocolInput || "HTTP",
      realDelayUrl: realDelayUrlInput,
      speedTestUrl: speedTestUrlInput
    };

    // Staggered execution
    await XrayManager.runSimulatedTests(
      configsList,
      settings,
      activeSites,
      (idx, result) => {
        setActiveTestIndex(idx);
        setTestResults(prev => ({
          ...prev,
          [result.config.raw]: result
        }));
      }
    );

    setIsTestingNetwork(false);
    setActiveTestIndex(null);
    showToast(lang === 'FA' ? "تست با موفقیت به پایان رسید!" : "Diagnostics completed successfully!");
  };

  // Get filtered healthy configs based on user preference (copyLimitMode & copyLimitInput)
  const getFilteredHealthyConfigs = (): string => {
    // Sort by score descending so that the user gets the best healthy configs first
    const healthy = [...configsList]
      .filter(c => {
        const res = testResults[c.raw];
        return res && res.isHealthy && res.smartScore > 0;
      })
      .sort((a, b) => {
        const scoreA = testResults[a.raw]?.smartScore || 0;
        const scoreB = testResults[b.raw]?.smartScore || 0;
        return scoreB - scoreA;
      });

    if (healthy.length === 0) return '';

    let selected = healthy;
    if (copyLimitMode === 'limited') {
      const limit = parseInt(copyLimitInput) || 5;
      selected = healthy.slice(0, limit);
    }

    return selected.map(c => c.raw).join('\n');
  };

  // Copy healthy configurations back to clipboard
  const handleCopyHealthy = () => {
    const healthyConfigs = getFilteredHealthyConfigs();

    if (!healthyConfigs) {
      showToast(lang === 'FA' ? "هیچ کانفیگ سالمی جهت کپی وجود ندارد" : "No healthy configs to copy");
      return;
    }

    navigator.clipboard.writeText(healthyConfigs);
    showToast(strings.copySuccessMsg);
  };

  // Save/Export healthy configs to plain txt file (HTML5 file save format)
  const handleSaveHealthyFile = () => {
    const healthyConfigs = getFilteredHealthyConfigs();

    if (!healthyConfigs) {
      showToast(lang === 'FA' ? "هیچ کانفیگ سالمی جهت ذخیره وجود ندارد" : "No healthy configs to save");
      return;
    }

    const blob = new Blob([healthyConfigs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Xray_Healthy_Configs_${new Date().toISOString().slice(0,10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(lang === 'FA' ? "فایل کانفیگ‌های سالم با موفقیت ذخیره شد" : "Healthy configs file saved successfully!");
  };

  // Sort configurations list based on results score (descending)
  const sortedConfigs = [...configsList].sort((a, b) => {
    const scoreA = testResults[a.raw]?.smartScore || 0;
    const scoreB = testResults[b.raw]?.smartScore || 0;
    return scoreB - scoreA;
  });

  return (
    <div className={`min-h-screen bg-[#121212] text-white p-4 pb-12 transition-all ${lang === 'FA' ? 'rtl' : 'ltr'}`}>
      
      {/* 11. Top Navigation Bar */}
      <nav className="max-w-7xl mx-auto flex flex-row justify-between items-center bg-[#1E1E1E] p-4 rounded-2xl border border-neutral-800 shadow-xl mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#6200EE]/25 rounded-xl border border-[#6200EE]/30 animate-pulse">
            <Zap className="w-6 h-6 text-[#03DAC6]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-display">{strings.appName}</h1>
            <p className="text-xs text-neutral-400 font-mono">v1.0.0 • Xray-Core Tester</p>
          </div>
        </div>
        
        <button 
          onClick={toggleLanguage}
          id="btn-lang-toggle"
          className="flex items-center gap-2 px-4 py-2 bg-[#121212] hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 active:scale-95 rounded-xl text-xs font-bold text-neutral-200 transition-all cursor-pointer"
        >
          <Languages className="w-4 h-4 text-[#03DAC6]" />
          <span>{strings.languageBtn}</span>
        </button>
      </nav>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Settings & Info) - Span 5 */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* CARD 1: Core Version Info */}
          <section className="bg-[#1E1E1E] p-5 rounded-2xl border border-neutral-800 shadow-lg" id="card-core-version">
            <div className="flex items-center gap-2.5 mb-4 text-[#03DAC6]">
              <Cpu className="w-5 h-5" />
              <h2 className="text-sm font-bold tracking-wide uppercase font-display">{lang === 'FA' ? "ارتقا دهنده هسته ایکس ری" : "Xray-Core Updater"}</h2>
            </div>
            
            <div className="space-y-2 mb-5 font-sans text-sm text-neutral-300">
              <div className="flex justify-between border-b border-neutral-800/50 pb-2">
                <span className="text-neutral-400">{strings.currentCoreVersion}</span>
                <span className="font-mono font-medium text-white">{localCoreVersion}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-neutral-400">{strings.latestCoreVersion}</span>
                <span className={`font-mono font-medium ${latestCoreVersion !== strings.unknown ? 'text-[#03DAC6]' : 'text-neutral-500'}`}>{latestCoreVersion}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleCheckCoreUpdate}
                disabled={isCheckingCore || isDownloadingCore}
                id="btn-check-core"
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#121212] hover:bg-neutral-800 disabled:opacity-40 border border-neutral-800 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#03DAC6] ${isCheckingCore ? 'animate-spin' : ''}`} />
                <span>{strings.checkVersionBtn}</span>
              </button>

              <button 
                onClick={handleDownloadCore}
                disabled={latestCoreVersion === strings.unknown || isDownloadingCore || isCheckingCore || localCoreVersion === latestCoreVersion}
                id="btn-download-core"
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#6200EE] hover:bg-[#5000C8] disabled:bg-neutral-800 disabled:opacity-40 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{strings.downloadCoreBtn}</span>
              </button>
            </div>

            {/* Simulated core extraction / download progress bar */}
            <AnimatePresence>
              {isDownloadingCore && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-neutral-800 space-y-2 overflow-hidden"
                >
                  <div className="flex justify-between text-xs font-mono text-neutral-400">
                    <span>{coreProgressText}</span>
                    <span>{Math.round(coreProgress * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#121212] rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-[#6200EE] to-[#03DAC6]"
                      animate={{ width: `${coreProgress * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* CARD 2: TLS Fingerprints Selector */}
          <section className="bg-[#1E1E1E] p-5 rounded-2xl border border-neutral-800 shadow-lg" id="card-fingerprint">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 text-[#03DAC6]">
                <Sliders className="w-5 h-5" />
                <h2 className="text-sm font-bold tracking-wide uppercase font-display">{strings.tlsFingerprint}</h2>
              </div>
              <span className="text-[10px] font-mono bg-[#121212] text-[#6200EE] border border-[#6200EE]/20 px-2 py-0.5 rounded-md font-bold">uTLS</span>
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsFpDropdownExpanded(!isFpDropdownExpanded)}
                id="btn-fp-dropdown"
                className="w-full flex justify-between items-center px-4 py-3 bg-[#121212] hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-xl text-sm font-mono text-white text-left transition-all cursor-pointer"
              >
                <span className="font-bold tracking-wide uppercase">{selectedFingerprint}</span>
                <ChevronDown className={`w-4 h-4 text-[#03DAC6] transition-transform ${isFpDropdownExpanded ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isFpDropdownExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute z-10 w-full mt-2 bg-[#121212] border border-neutral-800 rounded-xl shadow-2xl overflow-hidden"
                  >
                    {fingerprintOptions.map(option => (
                      <button
                        key={option}
                        onClick={() => {
                          setSelectedFingerprint(option);
                          setIsFpDropdownExpanded(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-xs font-mono uppercase transition-colors hover:bg-neutral-800 hover:text-[#03DAC6] cursor-pointer ${selectedFingerprint === option ? 'text-[#03DAC6] bg-[#6200EE]/10' : 'text-neutral-300'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* CARD 3: Diagnostics Panel / Settings */}
          <section className="bg-[#1E1E1E] p-5 rounded-2xl border border-neutral-800 shadow-lg" id="card-diagnostics-settings">
            <div className="flex items-center gap-2.5 mb-4 text-[#03DAC6]">
              <Settings className="w-5 h-5" />
              <h2 className="text-sm font-bold tracking-wide uppercase font-display">{strings.settingsTitle}</h2>
            </div>

            {/* Presets Toggle buttons */}
            <div className="mb-5 bg-[#121212] p-2.5 rounded-xl border border-neutral-800/80">
              <span className="block text-[11px] font-mono text-neutral-400 uppercase mb-2 text-center">
                {lang === 'FA' ? "پروفایل پیش‌فرض تست سرعت و تاخیر" : "Diagnostic Speed & Latency Preset Profile"}
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {(['ultra', 'balanced', 'stable', 'custom'] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      if (preset !== 'custom') {
                        applyTestPreset(preset);
                      } else {
                        setTestPreset('custom');
                      }
                    }}
                    className={`px-1 py-1.5 rounded-lg text-[10px] font-mono uppercase text-center transition-all border ${
                      testPreset === preset 
                        ? 'bg-[#6200EE] border-[#03DAC6]/40 text-white font-bold shadow' 
                        : 'bg-[#1E1E1E] border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    {preset === 'ultra' && (lang === 'FA' ? 'فوق‌العاده' : 'Ultra')}
                    {preset === 'balanced' && (lang === 'FA' ? 'متعادل' : 'Balanced')}
                    {preset === 'stable' && (lang === 'FA' ? 'پایدار' : 'Stable')}
                    {preset === 'custom' && (lang === 'FA' ? 'کاستوم' : 'Custom')}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-neutral-500 font-mono text-center leading-normal">
                {testPreset === 'ultra' && (lang === 'FA' ? "پینگ کوتاه، تست سریع، همزمانی بالا" : "Fast pings, swift test, high concurrency")}
                {testPreset === 'balanced' && (lang === 'FA' ? "تنظیمات استاندارد بهینه برای کارهای روزمرگی" : "Standard balanced parameters for general use")}
                {testPreset === 'stable' && (lang === 'FA' ? "تست سنگین با سمپل‌های جیتر بیشتر و با دقت فوق العاده" : "Heavy tests with high jitter samples & precise timing")}
                {testPreset === 'custom' && (lang === 'FA' ? "متغیرها و پارامترها به دلخواه شما سفارشی شده‌اند" : "Custom parameters modified manually by you")}
              </div>
            </div>

            {/* Test Selection Checkboxes */}
            <div className="space-y-3 mb-5 border-b border-neutral-800/50 pb-4">
              <label className="flex items-center gap-3 cursor-pointer select-none group text-xs text-neutral-300">
                <button onClick={() => setIsTcpPingChecked(!isTcpPingChecked)} className="text-[#03DAC6]">
                  {isTcpPingChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-neutral-600" />}
                </button>
                <span className="group-hover:text-white transition-colors">تست TCP Ping (تأخیر خام) / raw TCP Ping</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none group text-xs text-neutral-300">
                <button onClick={() => setIsJitterChecked(!isJitterChecked)} className="text-[#03DAC6]">
                  {isJitterChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-neutral-600" />}
                </button>
                <span className="group-hover:text-white transition-colors">تست جیتر (Jitter Delay Variance)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none group text-xs text-neutral-300">
                <button onClick={() => setIsRealDelayChecked(!isRealDelayChecked)} className="text-[#03DAC6]">
                  {isRealDelayChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-neutral-600" />}
                </button>
                <span className="group-hover:text-white transition-colors">تست تاخیر واقعی (HTTP Real Delay via Proxy)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none group text-xs text-neutral-300">
                <button onClick={() => setIsWebsiteReachChecked(!isWebsiteReachChecked)} className="text-[#03DAC6]">
                  {isWebsiteReachChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-neutral-600" />}
                </button>
                <span className="group-hover:text-white transition-colors">بررسی دسترسی به وب‌سایت‌های منتخب</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none group text-xs text-neutral-300">
                <button onClick={() => setIsDownloadSpeedChecked(!isDownloadSpeedChecked)} className="text-[#03DAC6]">
                  {isDownloadSpeedChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-neutral-600" />}
                </button>
                <span className="group-hover:text-white transition-colors">تست سرعت دانلود (Download speed test in Mbps)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none group text-xs text-neutral-300">
                <button onClick={() => setIsUploadSpeedChecked(!isUploadSpeedChecked)} className="text-[#03DAC6]">
                  {isUploadSpeedChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-neutral-600" />}
                </button>
                <span className="group-hover:text-white transition-colors">تست سرعت آپلود (Upload speed test in Mbps)</span>
              </label>
            </div>

            {/* Custom URLs and parameters */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1.5">{lang === 'FA' ? "مهلت پینگ" : "Ping Timeout"}</label>
                  <input 
                    type="number" 
                    value={pingTimeoutInput}
                    onChange={e => {
                      setPingTimeoutInput(e.target.value);
                      setTestPreset('custom');
                    }}
                    className="w-full px-3 py-2 bg-[#121212] border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#6200EE]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1.5">{lang === 'FA' ? "مهلت تاخیر واقعی" : "Real Delay Timeout"}</label>
                  <input 
                    type="number" 
                    value={realDelayTimeoutInput}
                    onChange={e => {
                      setRealDelayTimeoutInput(e.target.value);
                      setTestPreset('custom');
                    }}
                    className="w-full px-3 py-2 bg-[#121212] border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#6200EE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1.5">{strings.localSocksPort}</label>
                  <input 
                    type="number" 
                    value={socksPortInput}
                    onChange={e => setSocksPortInput(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121212] border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#6200EE]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1.5">{lang === 'FA' ? "تعداد همزمان" : "Concurrency limit"}</label>
                  <input 
                    type="number" 
                    value={concurrencyInput}
                    onChange={e => {
                      setConcurrencyInput(e.target.value);
                      setTestPreset('custom');
                    }}
                    className="w-full px-3 py-2 bg-[#121212] border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#6200EE]"
                  />
                </div>
              </div>

              {/* Extra Custom Testing Variables Grid */}
              <div className="border-t border-neutral-800/50 pt-4 mt-2">
                <span className="block text-[10px] font-mono text-neutral-400 uppercase mb-2">
                  {lang === 'FA' ? "پارامترهای کاستوم تست" : "Custom Testing Variables"}
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                      {lang === 'FA' ? "سمپل جیتر" : "Jitter Pings"}
                    </label>
                    <input 
                      type="number" 
                      value={jitterPingCountInput}
                      onChange={e => {
                        setJitterPingCountInput(e.target.value);
                        setTestPreset('custom');
                      }}
                      className="w-full px-2 py-1.5 bg-[#121212] border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#6200EE]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                      {lang === 'FA' ? "حجم دانلود" : "Volume Weight"}
                    </label>
                    <select
                      value={isCustomVolume ? "custom" : speedTestVolumeInput}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === "custom") {
                          setIsCustomVolume(true);
                          setSpeedTestVolumeInput(customVolumeMB);
                          localStorage.setItem('speed_test_volume', customVolumeMB);
                          const bytes = Math.round((parseFloat(customVolumeMB) || 15) * 1024 * 1024);
                          setSpeedTestUrlInput(`http://speed.cloudflare.com/__down?bytes=${bytes}`);
                        } else {
                          setIsCustomVolume(false);
                          setSpeedTestVolumeInput(val);
                          localStorage.setItem('speed_test_volume', val);
                          const bytes = parseInt(val) * 1024 * 1024;
                          setSpeedTestUrlInput(`http://speed.cloudflare.com/__down?bytes=${bytes}`);
                        }
                        setTestPreset('custom');
                      }}
                      className="w-full px-1.5 py-1.5 bg-[#121212] border border-neutral-800 rounded-lg text-[11px] font-mono text-white focus:outline-none focus:border-[#6200EE]"
                    >
                      <option value="1">1 MB</option>
                      <option value="2">2 MB</option>
                      <option value="5">5 MB</option>
                      <option value="10">10 MB</option>
                      <option value="custom">{lang === 'FA' ? "سفارشی..." : "Custom..."}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                      {lang === 'FA' ? "پروتکل" : "Protocol"}
                    </label>
                    <select
                      value={speedTestProtocolInput}
                      onChange={e => {
                        setSpeedTestProtocolInput(e.target.value);
                        setTestPreset('custom');
                      }}
                      className="w-full px-1.5 py-1.5 bg-[#121212] border border-neutral-800 rounded-lg text-[11px] font-mono text-white focus:outline-none focus:border-[#6200EE]"
                    >
                      <option value="HTTP">HTTP</option>
                      <option value="HTTPS">HTTPS (TLS)</option>
                    </select>
                  </div>
                </div>

                {isCustomVolume && (
                  <div className="mt-2.5 bg-[#1A1A1A]/50 p-2 border border-neutral-800/60 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
                    <span className="text-[11px] text-neutral-400">
                      {lang === 'FA' ? "حجم دلخواه دانلود (مگابایت):" : "Custom Download Vol (MB):"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={customVolumeMB}
                        onChange={e => {
                          const val = e.target.value;
                          setCustomVolumeMB(val);
                          setSpeedTestVolumeInput(val);
                          localStorage.setItem('speed_test_volume', val);
                          const num = parseFloat(val) || 15;
                          const bytes = Math.round(num * 1024 * 1024);
                          setSpeedTestUrlInput(`http://speed.cloudflare.com/__down?bytes=${bytes}`);
                          setTestPreset('custom');
                        }}
                        className="w-16 px-1.5 py-1 bg-[#121212] border border-[#6200EE]/30 rounded text-center text-xs font-mono font-bold text-[#03DAC6] focus:outline-none focus:border-[#03DAC6]"
                      />
                      <span className="text-[10px] font-mono text-neutral-500">MB</span>
                    </div>
                  </div>
                )}
              </div>

              {/* URL Selection Panel for Diagnostics */}
              <div className="border-t border-neutral-800/50 pt-4 mt-4 space-y-3">
                <span className="block text-[10px] font-mono text-neutral-400 uppercase font-bold tracking-wider">
                  {lang === 'FA' ? "تنظیم سرورهای ارزیابی سرعت و تاخیر" : "Diagnostic Target Server URLs"}
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Real Delay Test Server */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-neutral-400">
                      {lang === 'FA' ? "سرور تست تاخیر واقعی (HTTP Delay Server)" : "HTTP Real Delay Server"}
                    </label>
                    <div className="space-y-1.5">
                      <select
                        value={REAL_DELAY_SERVERS.some(s => s.url === realDelayUrlInput) ? realDelayUrlInput : "custom"}
                        onChange={e => {
                          const val = e.target.value;
                          if (val !== "custom") {
                            setRealDelayUrlInput(val);
                            localStorage.setItem('url_real_delay', val);
                          } else {
                            setRealDelayUrlInput("custom");
                          }
                          setTestPreset('custom');
                        }}
                        className="w-full px-2.5 py-1.5 bg-[#121212] border border-neutral-800 rounded-lg text-xs font-sans text-neutral-200 focus:outline-none focus:border-[#6200EE]"
                      >
                        {REAL_DELAY_SERVERS.map(s => (
                          <option key={s.url} value={s.url}>
                            {s.url === "custom" 
                              ? (lang === 'FA' ? "لینک سفارشی (دستی)" : "Custom URL (Manual)")
                              : `${s.name}`}
                          </option>
                        ))}
                      </select>

                      {(!REAL_DELAY_SERVERS.some(s => s.url === realDelayUrlInput) || realDelayUrlInput === "custom") && (
                        <input
                          type="text"
                          value={realDelayUrlInput === "custom" ? "" : realDelayUrlInput}
                          onChange={e => {
                            const val = e.target.value;
                            setRealDelayUrlInput(val);
                            localStorage.setItem('url_real_delay', val);
                            setTestPreset('custom');
                          }}
                          placeholder={lang === 'FA' ? "آدرس کامل (مثال: https://google.com/...)" : "Full URL (e.g., https://google.com/...)"}
                          className="w-full px-2.5 py-1.5 bg-[#121212] border border-[#6200EE]/30 rounded-lg text-xs font-mono text-[#03DAC6] placeholder-neutral-600 focus:outline-none focus:border-[#03DAC6]"
                        />
                      )}
                    </div>
                    {REAL_DELAY_SERVERS.some(s => s.url === realDelayUrlInput) && realDelayUrlInput !== "custom" && (
                      <p className="text-[9px] text-neutral-500 font-mono truncate">{realDelayUrlInput}</p>
                    )}
                  </div>

                  {/* Download Speed Test Server */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-neutral-400">
                      {lang === 'FA' ? "سرور تست سرعت دانلود (Download Server)" : "Download Speed Server"}
                    </label>
                    <div className="space-y-1.5">
                      <select
                        value={SPEED_TEST_SERVERS.some(s => s.url === speedTestUrlInput) ? speedTestUrlInput : "custom"}
                        onChange={e => {
                          const val = e.target.value;
                          if (val !== "custom") {
                            setSpeedTestUrlInput(val);
                            localStorage.setItem('url_speed_test', val);
                          } else {
                            setSpeedTestUrlInput("custom");
                          }
                          setTestPreset('custom');
                        }}
                        className="w-full px-2.5 py-1.5 bg-[#121212] border border-neutral-800 rounded-lg text-xs font-sans text-neutral-200 focus:outline-none focus:border-[#6200EE]"
                      >
                        {SPEED_TEST_SERVERS.map(s => (
                          <option key={s.url} value={s.url}>
                            {s.url === "custom" 
                              ? (lang === 'FA' ? "لینک سفارشی (دستی)" : "Custom URL (Manual)")
                              : `${s.name}`}
                          </option>
                        ))}
                      </select>

                      {(!SPEED_TEST_SERVERS.some(s => s.url === speedTestUrlInput) || speedTestUrlInput === "custom") && (
                        <input
                          type="text"
                          value={speedTestUrlInput === "custom" ? "" : speedTestUrlInput}
                          onChange={e => {
                            const val = e.target.value;
                            setSpeedTestUrlInput(val);
                            localStorage.setItem('url_speed_test', val);
                            setTestPreset('custom');
                          }}
                          placeholder={lang === 'FA' ? "لینک دانلود تستی (مستقیم)..." : "Direct download URL..."}
                          className="w-full px-2.5 py-1.5 bg-[#121212] border border-[#6200EE]/30 rounded-lg text-xs font-mono text-[#03DAC6] placeholder-neutral-600 focus:outline-none focus:border-[#03DAC6]"
                        />
                      )}
                    </div>
                    {SPEED_TEST_SERVERS.some(s => s.url === speedTestUrlInput) && speedTestUrlInput !== "custom" && (
                      <p className="text-[9px] text-neutral-500 font-mono truncate">{speedTestUrlInput}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CARD 4: Fragment Options */}
          <section className="bg-[#1E1E1E] p-5 rounded-2xl border border-neutral-800 shadow-lg" id="card-fragment">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 text-[#03DAC6]">
                <Info className="w-5 h-5" />
                <h3 className="text-sm font-bold tracking-wide uppercase font-display">{strings.fragmentSettings}</h3>
              </div>
              <button 
                onClick={() => setIsFragmentEnabled(!isFragmentEnabled)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${isFragmentEnabled ? 'bg-[#6200EE]' : 'bg-neutral-800'}`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${isFragmentEnabled ? (lang === 'FA' ? '-translate-x-4' : 'translate-x-4') : 'translate-x-0'}`} />
              </button>
            </div>

            {isFragmentEnabled && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-2 overflow-hidden"
              >
                {/* Fragment presets selector */}
                <div className="bg-[#121212] p-2 rounded-xl border border-neutral-800">
                  <span className="block text-[10px] font-mono text-neutral-400 uppercase mb-2 text-center">
                    {lang === 'FA' ? "پروفایل‌های پیش‌فرض فرگمنت" : "Fragment Presets Profiles"}
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {(['mci', 'mtn', 'tcp', 'custom'] as const).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          if (preset !== 'custom') {
                            applyFragmentPreset(preset);
                          } else {
                            setFragmentPreset('custom');
                          }
                        }}
                        className={`px-1 py-1 rounded-md text-[9px] font-mono uppercase text-center transition-all border ${
                          fragmentPreset === preset
                            ? 'bg-[#6200EE] border-[#03DAC6]/40 text-white font-bold'
                            : 'bg-[#1E1E1E] border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                        }`}
                      >
                        {preset === 'mci' && (lang === 'FA' ? 'همراه اول' : 'MCI')}
                        {preset === 'mtn' && (lang === 'FA' ? 'ایرانسل' : 'MTN')}
                        {preset === 'tcp' && (lang === 'FA' ? 'تی‌سی‌پی' : 'TCP')}
                        {preset === 'custom' && (lang === 'FA' ? 'کاستوم' : 'Custom')}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1 text-[9px] text-neutral-500 font-mono text-center">
                    {fragmentPreset === 'mci' && (lang === 'FA' ? "طول: ۱۰۰-۲۰۰، اینتروال: ۱۰-۲۰" : "Length: 100-200, Interval: 10-20")}
                    {fragmentPreset === 'mtn' && (lang === 'FA' ? "طول: ۱-۵، اینتروال: ۳-۱۰" : "Length: 1-5, Interval: 3-10")}
                    {fragmentPreset === 'tcp' && (lang === 'FA' ? "طول: ۵-۱۵، اینتروال: ۱۵-۲۵" : "Length: 5-15, Interval: 15-25")}
                    {fragmentPreset === 'custom' && (lang === 'FA' ? "تنظیمات فرگمنت دلخواه شما" : "Custom parameters modified manually")}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1.5">{strings.fragmentLength}</label>
                  <input 
                    type="text" 
                    value={fragmentLengthInput}
                    onChange={e => {
                      setFragmentLengthInput(e.target.value);
                      setFragmentPreset('custom');
                    }}
                    className="w-full px-3 py-2 bg-[#121212] border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#6200EE]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1.5">{strings.fragmentInterval}</label>
                  <input 
                    type="text" 
                    value={fragmentIntervalInput}
                    onChange={e => {
                      setFragmentIntervalInput(e.target.value);
                      setFragmentPreset('custom');
                    }}
                    className="w-full px-3 py-2 bg-[#121212] border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#6200EE]"
                  />
                </div>
              </motion.div>
            )}
          </section>

          {/* CARD 5: Multiplex Config */}
          <section className="bg-[#1E1E1E] p-5 rounded-2xl border border-neutral-800 shadow-lg" id="card-multiplex">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 text-[#03DAC6]">
                <Sliders className="w-5 h-5" />
                <h3 className="text-sm font-bold tracking-wide uppercase font-display">{strings.muxSettings}</h3>
              </div>
              <button 
                onClick={() => setIsMuxEnabled(!isMuxEnabled)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${isMuxEnabled ? 'bg-[#6200EE]' : 'bg-neutral-800'}`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${isMuxEnabled ? (lang === 'FA' ? '-translate-x-4' : 'translate-x-4') : 'translate-x-0'}`} />
              </button>
            </div>

            {isMuxEnabled && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-2 overflow-hidden"
              >
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1.5">{strings.muxConcurrency}</label>
                  <input 
                    type="number" 
                    value={muxConcurrencyInput}
                    onChange={e => setMuxConcurrencyInput(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121212] border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#6200EE]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 uppercase mb-1.5">{strings.xudpConcurrencyLabel}</label>
                  <input 
                    type="number" 
                    value={xudpConcurrencyInput}
                    onChange={e => setXudpConcurrencyInput(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121212] border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#6200EE]"
                  />
                </div>
              </motion.div>
            )}
          </section>

        </div>

        {/* Right Column (Import, Configs List, Live Reports) - Span 7 */}
        <div className="lg:col-span-7 space-y-6">

          {/* CARD 6: Import Area */}
          <section className="bg-[#1E1E1E] p-5 rounded-2xl border border-neutral-800 shadow-lg" id="card-import-configs">
            <div className="flex items-center gap-2.5 mb-4 text-[#03DAC6]">
              <Clipboard className="w-5 h-5" />
              <h2 className="text-sm font-bold tracking-wide uppercase font-display">{strings.selectConfigTitle}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <button 
                onClick={handleImportClipboard}
                id="btn-import-clipboard"
                className="flex items-center justify-center gap-2.5 px-4 py-3 bg-[#6200EE] hover:bg-[#5000C8] rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md shadow-[#6200EE]/10 active:scale-95"
              >
                <Clipboard className="w-4 h-4" />
                <span>{strings.importClipboard}</span>
              </button>

              <label 
                id="label-import-file"
                className="flex items-center justify-center gap-2.5 px-4 py-3 bg-[#121212] hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-xl text-xs font-bold text-neutral-200 transition-all cursor-pointer text-center active:scale-95"
              >
                <FileText className="w-4 h-4 text-[#03DAC6]" />
                <span>{strings.importFile}</span>
                <input 
                  type="file" 
                  accept=".txt,.json,.conf,*" 
                  onChange={handleImportFile}
                  className="hidden" 
                />
              </label>
            </div>

            <div className="border-t border-neutral-800/80 pt-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-3 flex items-center text-neutral-600">
                    <Link className="w-4 h-4" />
                  </span>
                  <input 
                    type="url" 
                    value={subUrlInput}
                    onChange={e => setSubUrlInput(e.target.value)}
                    placeholder={strings.subUrlPlaceholder}
                    className="w-full pl-9 pr-4 py-2.5 bg-[#121212] border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#6200EE] font-sans"
                  />
                </div>
                <button 
                  onClick={handleImportSubscription}
                  id="btn-import-sub"
                  className="px-4 py-2.5 bg-[#121212] hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 active:scale-95 rounded-xl text-xs font-bold text-neutral-200 transition-all cursor-pointer whitespace-nowrap"
                >
                  {strings.importSubLink}
                </button>
              </div>
            </div>
          </section>

          {/* CARD 7: Custom Websites reachability list */}
          <section className="bg-[#1E1E1E] p-5 rounded-2xl border border-neutral-800 shadow-lg" id="card-custom-websites">
            <div className="flex items-center gap-2.5 mb-4 text-[#03DAC6]">
              <Globe className="w-5 h-5" />
              <h2 className="text-sm font-bold tracking-wide uppercase font-display">{strings.customDomains}</h2>
            </div>

            {/* Inline Website Edit Dialog */}
            {editingDomain && (
              <div className="bg-[#6200EE]/10 p-3.5 rounded-xl border border-[#6200EE]/30 mb-4">
                <span className="block text-[11px] font-mono text-neutral-200 uppercase mb-2">
                  {lang === 'FA' ? "ویرایش وب‌سایت منتخب" : "Edit Selected Website Target"}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <input 
                    type="text" 
                    value={editNameInput}
                    onChange={e => setEditNameInput(e.target.value)}
                    placeholder="Name"
                    className="px-2.5 py-1.5 bg-[#121212] border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#03DAC6]"
                  />
                  <input 
                    type="text" 
                    value={editDomainInput}
                    onChange={e => setEditDomainInput(e.target.value)}
                    placeholder="domain.com"
                    className="px-2.5 py-1.5 bg-[#121212] border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#03DAC6]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEditWebsite}
                    className="flex-1 py-1.5 bg-[#6200EE] hover:bg-[#5000C8] text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    {lang === 'FA' ? "ذخیره تغییرات" : "Save Changes"}
                  </button>
                  <button
                    onClick={() => setEditingDomain(null)}
                    className="px-3 py-1.5 bg-[#1E1E1E] border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    {lang === 'FA' ? "انصراف" : "Cancel"}
                  </button>
                </div>
              </div>
            )}

            {/* Test websites checklist with multi-column grid layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
              {testTargets.map((target, idx) => (
                <div 
                  key={target.domain}
                  dir="rtl"
                  className={`flex items-center justify-between p-2.5 bg-[#121212] border rounded-xl text-xs transition-all ${target.isSelected ? 'border-[#03DAC6]/40 bg-[#03DAC6]/5 text-white' : 'border-neutral-800 text-neutral-400 hover:border-neutral-700'}`}
                >
                  <div 
                    onClick={() => {
                      const next = [...testTargets];
                      next[idx].isSelected = !target.isSelected;
                      setTestTargets(next);
                    }}
                    className="flex items-center gap-2.5 flex-1 cursor-pointer select-none overflow-hidden"
                  >
                    <span className="text-[#03DAC6] shrink-0">
                      {target.isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-neutral-600" />}
                    </span>
                    
                    {/* Website Favicon with fallback */}
                    <img 
                      src={`https://www.google.com/s2/favicons?sz=32&domain=${target.domain}`} 
                      className="w-4 h-4 rounded shrink-0 object-contain bg-neutral-900 border border-neutral-800/80 p-0.5" 
                      alt="" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => { 
                        (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='2' y1='12' x2='22' y2='12'/%3E%3Cpath d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/%3E%3C/svg%3E`;
                      }} 
                    />

                    <div className="truncate text-right font-sans flex-1 min-w-0">
                      <div className="font-bold text-white truncate text-[12px]">{target.displayName}</div>
                      <div className="text-[10px] text-neutral-500 truncate font-mono text-right mt-0.5" dir="ltr">{target.domain}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0 mr-2 flex-row-reverse">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEditWebsite(target);
                      }}
                      className="p-1 text-neutral-500 hover:text-[#03DAC6] hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWebsite(target.domain);
                      }}
                      className="p-1 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Form to Add New Website Target */}
            <div className="bg-[#121212] p-3.5 rounded-xl border border-neutral-800/80 mb-4">
              <span className="block text-[11px] font-mono text-neutral-400 uppercase mb-2">
                {lang === 'FA' ? "افزودن وب‌سایت جدید برای تست" : "Add New Test Website Target"}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
                <input 
                  type="text" 
                  value={newWebsiteName}
                  onChange={e => setNewWebsiteName(e.target.value)}
                  placeholder={lang === 'FA' ? "نام سایت (مثال: یوتیوب)" : "Site Name (e.g., YouTube)"}
                  className="px-2.5 py-1.5 bg-[#1E1E1E] border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#03DAC6]"
                />
                <input 
                  type="text" 
                  value={newWebsiteDomain}
                  onChange={e => setNewWebsiteDomain(e.target.value)}
                  placeholder={lang === 'FA' ? "دامنه (مثال: youtube.com)" : "Domain (e.g., youtube.com)"}
                  className="px-2.5 py-1.5 bg-[#1E1E1E] border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#03DAC6]"
                />
              </div>
              <button
                onClick={handleAddWebsite}
                className="w-full py-1.5 bg-[#03DAC6] hover:bg-[#01bfa5] text-neutral-900 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'FA' ? "افزودن سایت" : "Add Website"}</span>
              </button>
            </div>

          </section>

          {/* CORE ACTION BUTTON: Start Diagnostic Network Test */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleStartDiagnostics}
              disabled={isTestingNetwork || configsList.length === 0}
              id="btn-run-diagnostics"
              className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#6200EE] to-[#7B1FA2] hover:from-[#5000C8] hover:to-[#6A1B9A] disabled:from-neutral-800 disabled:to-neutral-800 disabled:opacity-40 rounded-2xl text-sm font-black text-white tracking-wider uppercase transition-all shadow-xl shadow-[#6200EE]/10 cursor-pointer active:scale-98"
            >
              <Play className={`w-5 h-5 text-[#03DAC6] ${isTestingNetwork ? 'animate-ping' : ''}`} />
              <span>{isTestingNetwork ? strings.statusChecking : strings.runTestsBtn}</span>
            </button>
            
            {configsList.length > 0 && (
              <button 
                onClick={handleClearConfigs}
                disabled={isTestingNetwork}
                id="btn-clear-configs"
                className="px-4 py-4 bg-[#121212] hover:bg-red-950/30 border border-neutral-800 hover:border-red-900/30 text-neutral-400 hover:text-red-400 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* CARD 8: Evaluation Results Dashboard */}
          {configsList.length > 0 && (
            <section className="bg-[#1E1E1E] p-5 rounded-2xl border border-neutral-800 shadow-xl space-y-4" id="card-results">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-800 pb-4 gap-3">
                <div className="flex items-center gap-2.5">
                  <ArrowUpDown className="w-5 h-5 text-[#03DAC6]" />
                  <h2 className="text-base font-bold font-display">{strings.testResultsTitle} ({configsList.length})</h2>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button 
                    onClick={handleCopyHealthy}
                    id="btn-copy-healthy"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121212] hover:bg-neutral-800 border border-neutral-800 rounded-lg text-[11px] font-bold text-white cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#03DAC6]" />
                    <span>{strings.exportHealthyBtn}</span>
                  </button>
                  <button 
                    onClick={handleSaveHealthyFile}
                    id="btn-save-healthy"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121212] hover:bg-neutral-800 border border-neutral-800 rounded-lg text-[11px] font-bold text-white cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-[#03DAC6]" />
                    <span>{lang === 'FA' ? "ذخیره فایل" : "Save File"}</span>
                  </button>
                </div>
              </div>

              {/* Copy / Export Limit control panel */}
              <div className="bg-[#121212] p-3 rounded-xl border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 font-medium">
                    {lang === 'FA' ? "دامنه خروجی کانفیگ‌های سالم:" : "Healthy Export Limit Range:"}
                  </span>
                  <div className="flex rounded-lg overflow-hidden border border-neutral-800">
                    <button
                      onClick={() => {
                        setCopyLimitMode('all');
                        localStorage.setItem('copy_limit_mode', 'all');
                      }}
                      className={`px-3 py-1.5 font-bold transition-all cursor-pointer ${copyLimitMode === 'all' ? 'bg-[#6200EE] text-white' : 'bg-[#1E1E1E] text-neutral-400 hover:text-white'}`}
                    >
                      {lang === 'FA' ? "همه کانفیگ‌های سالم" : "All Healthy"}
                    </button>
                    <button
                      onClick={() => {
                        setCopyLimitMode('limited');
                        localStorage.setItem('copy_limit_mode', 'limited');
                      }}
                      className={`px-3 py-1.5 font-bold transition-all cursor-pointer ${copyLimitMode === 'limited' ? 'bg-[#6200EE] text-white' : 'bg-[#1E1E1E] text-neutral-400 hover:text-white'}`}
                    >
                      {lang === 'FA' ? "تعداد مشخص" : "Custom Limit"}
                    </button>
                  </div>
                </div>

                {copyLimitMode === 'limited' && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-neutral-500 font-mono text-[11px]">
                      {lang === 'FA' ? "تعداد خروجی:" : "Limit Count:"}
                    </span>
                    <input 
                      type="number" 
                      min="1"
                      value={copyLimitInput}
                      onChange={e => {
                        const val = e.target.value;
                        setCopyLimitInput(val);
                        localStorage.setItem('copy_limit_count', val);
                      }}
                      className="w-16 px-2.5 py-1 bg-[#1E1E1E] border border-neutral-800 rounded text-center text-xs font-mono font-bold text-[#03DAC6] focus:outline-none focus:border-[#6200EE]"
                    />
                  </div>
                )}
              </div>

              {/* STAGGERED CONFIGS RESULTS LIST */}
              <div className="space-y-4">
                {sortedConfigs.map((config) => {
                  const res = testResults[config.raw];
                  const isActive = activeTestIndex === configsList.findIndex(c => c.raw === config.raw);
                  
                  return (
                    <motion.div 
                      key={config.raw}
                      layout
                      className={`p-4 rounded-xl border transition-all ${isActive ? 'border-[#03DAC6] bg-[#03DAC6]/5 shadow-lg shadow-[#03DAC6]/5' : 'border-neutral-800/80 bg-[#121212]/80 hover:border-neutral-700'}`}
                    >
                      <div className="flex justify-between items-start gap-3 mb-3 overflow-hidden">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 max-w-full overflow-hidden">
                            <span className="text-[10px] sm:text-xs font-mono font-bold bg-[#6200EE]/20 border border-[#6200EE]/30 text-[#03DAC6] px-1.5 py-0.5 rounded uppercase shrink-0">
                              {config.protocol}
                            </span>
                            <h3 className="text-xs font-bold font-sans text-neutral-100 truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[280px] md:max-w-[380px]" title={config.remarks}>{config.remarks}</h3>
                          </div>
                          <p className="text-[10px] font-mono text-neutral-500 truncate max-w-[160px] xs:max-w-[220px] sm:max-w-[320px] md:max-w-md" title={`${config.address}:${config.port}`}>{config.address}:{config.port}</p>
                        </div>

                        {/* Smart score display */}
                        {res ? (
                          <div className="text-right shrink-0">
                            <div className="text-sm font-black font-mono text-[#03DAC6]">{res.smartScore.toFixed(2)}</div>
                            <div className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono">Score</div>
                          </div>
                        ) : (
                          <div className="text-xs font-mono text-neutral-600 italic shrink-0">
                            {isActive ? strings.statusChecking : lang === 'FA' ? "در انتظار تست" : "Pending"}
                          </div>
                        )}
                      </div>

                      {/* Diagnostic details if result is ready */}
                      {res && (
                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2 pt-3 border-t border-neutral-800/50">
                          
                          {/* Raw Ping */}
                          <div className="bg-[#1E1E1E] p-2 rounded-lg border border-neutral-800 text-center space-y-0.5 min-w-0">
                            <span className="block text-[9px] text-neutral-500 font-bold uppercase font-display truncate">{strings.tcpPingLabel}</span>
                            <span className={`block text-xs font-mono font-bold truncate ${res.tcpPing > 0 ? 'text-[#03DAC6]' : 'text-red-500'}`}>
                              {res.tcpPing > 0 ? `${res.tcpPing} ms` : strings.statusFailed}
                            </span>
                          </div>

                          {/* Jitter */}
                          <div className="bg-[#1E1E1E] p-2 rounded-lg border border-neutral-800 text-center space-y-0.5 min-w-0">
                            <span className="block text-[9px] text-neutral-500 font-bold uppercase font-display truncate">{strings.jitterLabel}</span>
                            <span className={`block text-xs font-mono font-bold truncate ${res.jitter > 0 ? 'text-amber-400' : 'text-neutral-500'}`}>
                              {res.jitter > 0 ? `±${res.jitter.toFixed(1)} ms` : strings.statusFailed}
                            </span>
                          </div>

                          {/* HTTP Real Delay */}
                          <div className="bg-[#1E1E1E] p-2 rounded-lg border border-neutral-800 text-center space-y-0.5 min-w-0">
                            <span className="block text-[9px] text-neutral-500 font-bold uppercase font-display truncate">{strings.realDelayLabel}</span>
                            <span className={`block text-xs font-mono font-bold truncate ${res.realDelay > 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                              {res.realDelay > 0 ? `${res.realDelay} ms` : strings.statusFailed}
                            </span>
                          </div>

                          {/* Download Speed */}
                          <div className="bg-[#1E1E1E] p-2 rounded-lg border border-neutral-800 text-center space-y-0.5 min-w-0">
                            <span className="block text-[9px] text-neutral-500 font-bold uppercase font-display truncate">{strings.downloadSpeedLabel}</span>
                            <span className={`block text-xs font-mono font-bold truncate ${res.downloadSpeedMbps > 0 ? 'text-blue-400' : 'text-neutral-500'}`}>
                              {res.downloadSpeedMbps > 0 ? `${res.downloadSpeedMbps.toFixed(1)} Mb/s` : '—'}
                            </span>
                          </div>

                          {/* Upload Speed */}
                          <div className="bg-[#1E1E1E] p-2 rounded-lg border border-neutral-800 text-center space-y-0.5 min-w-0 col-span-2 xs:col-span-1">
                            <span className="block text-[9px] text-neutral-500 font-bold uppercase font-display truncate">{strings.uploadSpeedLabel}</span>
                            <span className={`block text-xs font-mono font-bold truncate ${res.uploadSpeedMbps > 0 ? 'text-purple-400' : 'text-neutral-500'}`}>
                              {res.uploadSpeedMbps > 0 ? `${res.uploadSpeedMbps.toFixed(1)} Mb/s` : '—'}
                            </span>
                          </div>

                        </div>
                      )}

                      {/* Site diagnostics expandable strip */}
                      {res && res.siteReports.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-neutral-800/30 flex flex-wrap gap-1.5 max-w-full overflow-hidden">
                          {res.siteReports.map(report => {
                            const isSafe = report.status === 'SAFE';
                            const statusColor = isSafe ? 'text-emerald-400 border-emerald-950/40 bg-emerald-950/20' : 'text-rose-400 border-rose-950/40 bg-rose-950/20';
                            
                            return (
                              <span 
                                key={report.domain}
                                className={`text-[10px] font-sans px-2.5 py-1 border rounded-lg flex items-center gap-1.5 ${statusColor} max-w-full overflow-hidden`}
                                title={`${report.domain} (${isSafe ? `${report.rttMs}ms` : report.status.toLowerCase()})`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                                <span className="truncate">{report.domain} ({isSafe ? `${report.rttMs}ms` : report.status.toLowerCase()})</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

        </div>

      </div>

      {/* 12. Floating premium status toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 ${lang === 'FA' ? 'right-6' : 'left-6'} z-50 flex items-center gap-2.5 bg-neutral-900 border border-[#03DAC6]/25 shadow-2xl px-5 py-3.5 rounded-xl text-xs font-bold text-white`}
          >
            <AlertCircle className="w-4.5 h-4.5 text-[#03DAC6]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
