/**
 * BGO Toolkit — Tahap 1 + 2
 * Modul: Storage, Data, Dashboard, Notepad, Provision, Calculator, UI, App
 */
const BGO = (function () {
  'use strict';

  // ─── Konstanta ───────────────────────────────────────────────
  const STORAGE_KEY = 'bgo_toolkit_v1';
  const SAVE_DEBOUNCE_MS = 300;

  const STATUSES = ['Draft', 'Pending', 'Process', 'Done', 'Cancel'];
  const JENIS_BG = [
    'Jaminan Penawaran',
    'Jaminan Sanggah Banding',
    'Jaminan Pelaksanaan',
    'Jaminan Pemeliharaan',
    'Jaminan Pembayaran',
    'Jaminan Uang Muka',
    'Jaminan Jenis Lainnya'
  ];

  const COVER_OPTIONS = [
    'Rekening Setoran Jaminan',
    'Setor Jaminan 100%',
    'Setor Jaminan <100% (Fasilitas)',
    'Kontra Asuransi'
  ];

  const COVER_REKENING = 'Rekening Setoran Jaminan';
  const COVER_SETOR_100 = 'Setor Jaminan 100%';
  const COVER_SETOR_FASILITAS = 'Setor Jaminan <100% (Fasilitas)';
  const COVER_KONTRA = 'Kontra Asuransi';

  const ADMIN_TIER_1_MAX = 300000000;
  const ADMIN_TIER_1_FEE = 100000;
  const ADMIN_TIER_2_MAX = 1000000000;
  const ADMIN_TIER_2_FEE = 250000;
  const ADMIN_TIER_3_FEE = 500000;
  const FORMAT_KHUSUS_FEE = 500000;
  const KONTRA_RATE_ANNUAL = 1.25;
  const MINIMUM_PROVISI = 1000000;
  const REKENING_PROVISI_FIXED = 1000000;

  /** Rate per kuartal (%) — Cover Setor Jaminan 100% */
  const RATES_SETOR_100 = {
    'Jaminan Penawaran': 0.35,
    'Jaminan Sanggah Banding': 0.35,
    'Jaminan Pemeliharaan': 0.35,
    'Jaminan Pelaksanaan': 0.50,
    'Jaminan Pembayaran': 0.50,
    'Jaminan Uang Muka': 0.50,
    'Jaminan Jenis Lainnya': 0.50
  };

  /** Rate per kuartal (%) — Cover Setor Jaminan <100% (Fasilitas) */
  const RATES_SETOR_FASILITAS = {
    'Jaminan Penawaran': 0.70,
    'Jaminan Sanggah Banding': 0.70,
    'Jaminan Pemeliharaan': 0.70,
    'Jaminan Pelaksanaan': 0.75,
    'Jaminan Pembayaran': 0.75,
    'Jaminan Uang Muka': 0.75,
    'Jaminan Jenis Lainnya': 0.75
  };

  // ─── State ─────────────────────────────────────────────────────
  let state = null;
  let saveTimer = null;
  let pendingDeleteId = null;
  let lastCalcResult = null;

  // ─── Utils ─────────────────────────────────────────────────────

  /** Generate ID unik untuk record */
  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  /** Tanggal hari ini dalam format YYYY-MM-DD */
  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  /** ISO timestamp sekarang */
  function nowISO() {
    return new Date().toISOString();
  }

  /** Format angka ke Rupiah Indonesia */
  function formatRupiah(value) {
    const num = Number(value) || 0;
    return 'Rp' + num.toLocaleString('id-ID');
  }

  /** Parse string input ke angka (terima format Rupiah atau angka mentah) */
  function parseNumber(value) {
    if (value === null || value === undefined) return 0;
    const str = String(value).replace(/[^\d]/g, '');
    return str === '' ? 0 : parseInt(str, 10);
  }

  /** Format angka dengan pemisah ribuan (tanpa Rp) — untuk input kalkulator */
  function formatNumberDots(value) {
    const num = Number(value) || 0;
    return num.toLocaleString('id-ID');
  }

  /** Konversi DD/MM/YYYY ke ISO YYYY-MM-DD */
  function ddmmyyyyToISO(str) {
    const m = String(str || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return '';
    return m[3] + '-' + m[2] + '-' + m[1];
  }

  /** Konversi ISO ke DD/MM/YYYY */
  function isoToDDMMYYYY(iso) {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return '';
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  /** Auto-format input tanggal DD/MM/YYYY saat mengetik */
  function autoFormatDateInput(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
  }

  /** Validasi tanggal DD/MM/YYYY */
  function isValidDDMMYYYY(str) {
    const iso = ddmmyyyyToISO(str);
    if (!iso) return false;
    const d = parseDate(iso);
    const parts = iso.split('-').map(Number);
    return d.getFullYear() === parts[0] &&
      d.getMonth() === parts[1] - 1 &&
      d.getDate() === parts[2];
  }

  /** Parse input rate persen (terima koma/titik) */
  function parseRate(value) {
    const str = String(value || '').replace(',', '.').replace(/[^\d.]/g, '');
    return parseFloat(str) || 0;
  }

  /** Tentukan minimum provisi yang berlaku */
  function resolveMinimumProvisi(input) {
    if (input.tarifKhusus) {
      return input.minProvisiKhusus > 0 ? input.minProvisiKhusus : MINIMUM_PROVISI;
    }
    return MINIMUM_PROVISI;
  }

  /** Tentukan biaya admin final dengan semua pengecualian */
  function resolveAdminFee(input) {
    if (input.gratisAdmin || input.mgt || input.cover === COVER_KONTRA) return 0;
    return calculateAdminFee(input.nilaiBG);
  }

  /** Hitung biaya administrasi berdasarkan tier Nilai BG */
  function calculateAdminFee(nilaiBG) {
    if (nilaiBG <= ADMIN_TIER_1_MAX) return ADMIN_TIER_1_FEE;
    if (nilaiBG <= ADMIN_TIER_2_MAX) return ADMIN_TIER_2_FEE;
    return ADMIN_TIER_3_FEE;
  }

  /**
   * Format: Applicant - Rp{Nilai BG} - NoBG - NoRegistrasi
   * Nilai BG memakai format Rupiah Indonesia (Rp + pemisah ribuan).
   */
  function generateNamaFile(app) {
    const applicant = (app.applicant || '').trim() || '-';
    const nilaiBG = formatRupiah(app.nilaiBG || 0);
    const noBG = (app.noBG || '').trim() || '-';
    const noReg = (app.noRegistrasi || '').trim() || '-';
    return applicant + ' - ' + nilaiBG + ' - ' + noBG + ' - ' + noReg;
  }

  /** Parse string ISO date ke objek Date (lokal) */
  function parseDate(iso) {
    const parts = iso.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  /** Tambah bulan ke tanggal (mengikuti perilaku Date JS / Excel) */
  function addMonths(date, months) {
    const d = new Date(date.getTime());
    d.setMonth(d.getMonth() + months);
    return d;
  }

  /** Format rate persen untuk tampilan */
  function formatRate(rate, basis) {
    return rate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '% ' + basis;
  }

  /** Salin teks ke clipboard */
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      resolve();
    });
  }

  // ─── Keyboard helpers ─────────────────────────────────────────

  const Keyboard = {
    /** Deteksi Ctrl/Cmd + key tanpa Shift/Alt (hindari tab incognito Ctrl+Shift+N) */
    isMod(e, code) {
      return e.code === code && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey;
    },

    /** Enter = field berikutnya; commit blur dulu agar data tersimpan */
    bindEnterNav(el, getOrder, onEnter) {
      el.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || e.shiftKey) return;
        e.preventDefault();
        if (typeof onEnter === 'function' && onEnter(el, e) === true) return;
        const current = el;
        if (current.blur) current.blur();
        requestAnimationFrame(function () {
          const order = getOrder();
          const idx = order.indexOf(current);
          if (idx >= 0 && idx < order.length - 1) {
            const next = order[idx + 1];
            next.focus();
            if (next.select && next.type !== 'checkbox' && next.tagName !== 'SELECT') {
              try { next.select(); } catch (_) { /* noop */ }
            }
          }
        });
      });
    }
  };

  /** Record aplikasi kosong */
  function createEmptyApplication() {
    const now = nowISO();
    const app = {
      id: generateId(),
      tanggal: todayISO(),
      applicant: '',
      nilaiBG: 0,
      noBG: '',
      noRegistrasi: '',
      namaFile: '',
      noAplikasi: '',
      nilaiProvisi: 0,
      kodeCabang: '',
      namaCabang: '',
      jenisBG: '',
      status: 'Pending',
      note: '',
      createdAt: now,
      updatedAt: now
    };
    app.namaFile = generateNamaFile(app);
    return app;
  }

  /** State default */
  function defaultState() {
    return {
      version: 1,
      applications: [],
      settings: {
        activeView: 'dashboard',
        filters: {
          tanggalFrom: '',
          tanggalTo: '',
          cabang: '',
          jenisBG: '',
          status: ''
        },
        notepadSearch: '',
        sortField: 'tanggal',
        sortDir: 'desc'
      },
      meta: {
        lastSaved: null
      }
    };
  }

  // ─── Storage ───────────────────────────────────────────────────

  const Storage = {
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== 1) return defaultState();
        if (!Array.isArray(parsed.applications)) parsed.applications = [];
        if (!parsed.settings) parsed.settings = defaultState().settings;
        if (!parsed.settings.filters) parsed.settings.filters = defaultState().settings.filters;
        if (!parsed.settings.sortField) parsed.settings.sortField = 'tanggal';
        if (!parsed.settings.sortDir) parsed.settings.sortDir = 'desc';
        parsed.applications.forEach(function (app) {
          app.namaFile = generateNamaFile(app);
        });
        return parsed;
      } catch (e) {
        console.error('Gagal load localStorage:', e);
        return defaultState();
      }
    },

    save(data) {
      data.meta = data.meta || {};
      data.meta.lastSaved = nowISO();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },

    scheduleSave() {
      UI.showSaveStatus('saving');
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        Storage.save(state);
        UI.showSaveStatus('saved');
      }, SAVE_DEBOUNCE_MS);
    }
  };

  // ─── Data (filter, search, sort) ───────────────────────────────

  const Data = {
    /** Ambil daftar cabang unik dari semua record */
    getUniqueCabang() {
      const set = new Set();
      state.applications.forEach(function (app) {
        const name = (app.namaCabang || '').trim();
        if (name) set.add(name);
      });
      return Array.from(set).sort();
    },

    /** Cek apakah record lolos filter */
    passesFilters(app) {
      const f = state.settings.filters;

      if (f.tanggalFrom && app.tanggal < f.tanggalFrom) return false;
      if (f.tanggalTo && app.tanggal > f.tanggalTo) return false;
      if (f.cabang && app.namaCabang !== f.cabang) return false;
      if (f.jenisBG && app.jenisBG !== f.jenisBG) return false;
      if (f.status && app.status !== f.status) return false;

      return true;
    },

    /** Cek apakah record cocok dengan search query */
    passesSearch(app) {
      const q = (state.settings.notepadSearch || '').trim().toLowerCase();
      if (!q) return true;

      const fields = [
        app.applicant,
        app.noBG,
        app.noRegistrasi,
        app.noAplikasi,
        app.namaCabang
      ];

      return fields.some(function (field) {
        return String(field || '').toLowerCase().includes(q);
      });
    },

    /** Dapatkan aplikasi terfilter (tanpa search — untuk dashboard) */
    getFilteredApplications() {
      return state.applications.filter(Data.passesFilters);
    },

    /** Dapatkan aplikasi terfilter + search (untuk notepad) */
    getNotepadApplications() {
      return Data.getFilteredApplications()
        .filter(Data.passesSearch)
        .sort(Data.compareApps);
    },

    /** Comparator untuk sorting */
    compareApps(a, b) {
      const field = state.settings.sortField;
      const dir = state.settings.sortDir === 'asc' ? 1 : -1;

      let valA, valB;

      switch (field) {
        case 'nilaiBG':
          valA = a.nilaiBG || 0;
          valB = b.nilaiBG || 0;
          break;
        case 'status':
          valA = (a.status || '').toLowerCase();
          valB = (b.status || '').toLowerCase();
          break;
        case 'namaCabang':
          valA = (a.namaCabang || '').toLowerCase();
          valB = (b.namaCabang || '').toLowerCase();
          break;
        case 'tanggal':
        default:
          valA = a.tanggal || '';
          valB = b.tanggal || '';
          break;
      }

      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    },

    /** Agregasi statistik dashboard */
    getDashboardStats() {
      const apps = Data.getFilteredApplications();
      let totalNilaiBG = 0;
      let totalProvisi = 0;
      let pending = 0;
      let process = 0;
      let done = 0;

      apps.forEach(function (app) {
        totalNilaiBG += app.nilaiBG || 0;
        totalProvisi += app.nilaiProvisi || 0;
        if (app.status === 'Pending') pending++;
        else if (app.status === 'Process') process++;
        else if (app.status === 'Done') done++;
      });

      return {
        totalAplikasi: apps.length,
        totalNilaiBG: totalNilaiBG,
        totalProvisi: totalProvisi,
        totalPending: pending,
        totalProcess: process,
        totalDone: done
      };
    },

    /** Cari record by ID */
    findById(id) {
      return state.applications.find(function (app) { return app.id === id; });
    },

    /** Cari record by nama applicant (case-insensitive) */
    findByApplicant(name) {
      const key = (name || '').trim().toLowerCase();
      if (!key) return null;
      return state.applications.find(function (app) {
        return (app.applicant || '').trim().toLowerCase() === key;
      }) || null;
    },

    /** Update field pada record */
    updateField(id, field, value) {
      const app = Data.findById(id);
      if (!app) return;

      if (field === 'nilaiBG' || field === 'nilaiProvisi') {
        app[field] = parseNumber(value);
      } else {
        app[field] = value;
      }

      app.updatedAt = nowISO();

      if (['applicant', 'nilaiBG', 'noBG', 'noRegistrasi'].indexOf(field) !== -1) {
        app.namaFile = generateNamaFile(app);
      }

      Storage.scheduleSave();
    },

    /** Tambah record baru */
    addApplication() {
      const app = createEmptyApplication();
      state.applications.unshift(app);
      Storage.scheduleSave();
      return app;
    },

    /** Hapus record */
    deleteApplication(id) {
      state.applications = state.applications.filter(function (app) {
        return app.id !== id;
      });
      Storage.scheduleSave();
    },

    /** Tambah record dari hasil kalkulator */
    addFromCalculator(entry) {
      const now = nowISO();
      const app = {
        id: generateId(),
        tanggal: todayISO(),
        applicant: entry.applicant.trim(),
        nilaiBG: entry.nilaiBG,
        noBG: '',
        noRegistrasi: '',
        namaFile: '',
        noAplikasi: '',
        nilaiProvisi: entry.nilaiProvisi,
        kodeCabang: '',
        namaCabang: '',
        jenisBG: entry.jenisBG,
        status: 'Pending',
        note: '',
        createdAt: now,
        updatedAt: now
      };
      app.namaFile = generateNamaFile(app);
      state.applications.unshift(app);
      Storage.scheduleSave();
      return app;
    },

    /** Update record existing dari hasil kalkulator */
    updateFromCalculator(id, entry) {
      const app = Data.findById(id);
      if (!app) return null;
      app.nilaiBG = entry.nilaiBG;
      app.nilaiProvisi = entry.nilaiProvisi;
      app.jenisBG = entry.jenisBG;
      app.tanggal = todayISO();
      app.namaFile = generateNamaFile(app);
      app.updatedAt = nowISO();
      Storage.scheduleSave();
      return app;
    },

    /**
     * Simpan dari kalkulator: update baris jika applicant sudah ada,
     * otherwise buat baris baru.
     */
    saveFromCalculator(entry) {
      const existing = Data.findByApplicant(entry.applicant);
      if (existing) return Data.updateFromCalculator(existing.id, entry);
      return Data.addFromCalculator(entry);
    }
  };

  // ─── Provision (Business Logic Kalkulator) ─────────────────────

  const Provision = {
    /**
     * Hitung jumlah hari: Tanggal Berakhir - Tanggal Berlaku (non-inclusive).
     */
    calculateDays(tglBerlaku, tglBerakhir) {
      const start = parseDate(tglBerlaku);
      const end = parseDate(tglBerakhir);
      const MS_PER_DAY = 86400000;
      return Math.round((end - start) / MS_PER_DAY);
    },

    /**
     * Hitung jumlah kuartal mengikuti aturan Excel existing.
     * Jika melewati batas kuartal walaupun 1 hari, naik ke kuartal berikutnya.
     */
    calculateQuarters(tglBerlaku, tglBerakhir) {
      const start = parseDate(tglBerlaku);
      const end = parseDate(tglBerakhir);
      let quarters = 1;
      let boundary = addMonths(start, 3);

      while (end > boundary) {
        quarters++;
        boundary = addMonths(start, 3 * quarters);
      }
      return quarters;
    },

    /** Ambil rate (%) berdasarkan cover dan jenis BG */
    getRate(cover, jenisBG) {
      if (cover === COVER_REKENING) return 0;
      if (cover === COVER_KONTRA) return KONTRA_RATE_ANNUAL;
      const table = cover === COVER_SETOR_100 ? RATES_SETOR_100 : RATES_SETOR_FASILITAS;
      return table[jenisBG] || 0;
    },

    /** Cek apakah tanggal lengkap dan valid */
    hasValidDates(input) {
      return input.tglBerlaku && input.tglBerakhir &&
        isValidDDMMYYYY(input.tglBerlakuDisplay) &&
        isValidDDMMYYYY(input.tglBerakhirDisplay) &&
        input.tglBerakhir > input.tglBerlaku;
    },

    /** Validasi input kalkulator */
    validate(input) {
      const errors = {};

      if (!input.applicants.length) {
        errors.applicants = 'Minimal 1 applicant wajib diisi';
      } else {
        input.applicants.forEach(function (a, i) {
          if (!a.name.trim()) {
            errors.applicants = 'Nama Applicant ' + (i + 1) + ' wajib diisi';
          }
        });
        if (!errors.applicants) {
          const totalPct = input.applicants.reduce(function (s, a) { return s + a.pct; }, 0);
          if (input.applicants.length > 1 && totalPct !== 100) {
            errors.applicants = 'Total persentase semua applicant harus = 100% (sekarang ' + totalPct + '%)';
          }
        }
      }

      if (!input.cover) {
        errors.cover = 'Cover Jaminan wajib dipilih';
      }
      if (!input.jenisBG) {
        errors.jenisBG = 'Jenis BG wajib dipilih';
      }
      if (!input.nilaiBG || input.nilaiBG <= 0) {
        errors.nilaiBG = 'Nilai BG wajib diisi dan tidak boleh 0';
      }

      if (input.tarifKhusus) {
        if (input.rateKhususStr === '') {
          errors.rateKhusus = 'Rate khusus wajib diisi (boleh 0)';
        } else if (input.rateKhusus < 0 || isNaN(input.rateKhusus)) {
          errors.rateKhusus = 'Rate khusus tidak valid';
        }

        if (input.rateKhusus > 0) {
          const hasDates = input.tglBerlakuDisplay || input.tglBerakhirDisplay;
          if (hasDates) {
            if (!input.tglBerlakuDisplay) {
              errors.tglBerlaku = 'Tanggal Berlaku wajib diisi jika Tanggal Berakhir diisi';
            } else if (!isValidDDMMYYYY(input.tglBerlakuDisplay)) {
              errors.tglBerlaku = 'Format tanggal tidak valid (DD/MM/YYYY)';
            }
            if (!input.tglBerakhirDisplay) {
              errors.tglBerakhir = 'Tanggal Berakhir wajib diisi jika Tanggal Berlaku diisi';
            } else if (!isValidDDMMYYYY(input.tglBerakhirDisplay)) {
              errors.tglBerakhir = 'Format tanggal tidak valid (DD/MM/YYYY)';
            } else if (input.tglBerlaku && input.tglBerakhir <= input.tglBerlaku) {
              errors.tglBerakhir = 'Tanggal Berakhir harus lebih besar dari Tanggal Berlaku';
            }
          } else if (input.basisKhusus === 'annum') {
            if (!input.manualHari || input.manualHari <= 0) {
              errors.manualHari = 'Jumlah Hari wajib diisi (atau isi tanggal)';
            }
          } else if (!input.manualKuartal || input.manualKuartal <= 0) {
            errors.manualKuartal = 'Jumlah Kuartal wajib diisi (atau isi tanggal)';
          }
        }
        if (input.minProvisiKhususStr !== '' && input.minProvisiKhusus < 0) {
          errors.minProvisiKhusus = 'Minimum provisi tidak valid';
        }
      } else {
        if (!input.tglBerlaku) {
          errors.tglBerlaku = 'Tanggal Berlaku wajib diisi (DD/MM/YYYY)';
        } else if (!isValidDDMMYYYY(input.tglBerlakuDisplay)) {
          errors.tglBerlaku = 'Format tanggal tidak valid (DD/MM/YYYY)';
        }
        if (!input.tglBerakhir) {
          errors.tglBerakhir = 'Tanggal Berakhir wajib diisi (DD/MM/YYYY)';
        } else if (!isValidDDMMYYYY(input.tglBerakhirDisplay)) {
          errors.tglBerakhir = 'Format tanggal tidak valid (DD/MM/YYYY)';
        } else if (input.tglBerlaku && input.tglBerakhir <= input.tglBerlaku) {
          errors.tglBerakhir = 'Tanggal Berakhir harus lebih besar dari Tanggal Berlaku';
        }
      }

      return {
        valid: Object.keys(errors).length === 0,
        errors: errors
      };
    },

    /** Bagi provisi per applicant */
    splitProvisi(totalProvisi, applicants) {
      if (applicants.length === 1) {
        return [{
          name: applicants[0].name.trim(),
          pct: applicants[0].pct || 100,
          provisi: totalProvisi
        }];
      }
      const result = [];
      let assigned = 0;
      for (let i = 0; i < applicants.length; i++) {
        const a = applicants[i];
        if (i === applicants.length - 1) {
          result.push({
            name: a.name.trim(),
            pct: a.pct,
            provisi: totalProvisi - assigned
          });
        } else {
          const p = Math.round(totalProvisi * a.pct / 100);
          result.push({ name: a.name.trim(), pct: a.pct, provisi: p });
          assigned += p;
        }
      }
      return result;
    },

    /** Resolve jumlah hari & kuartal untuk kalkulasi */
    resolvePeriod(input) {
      const hasDates = Provision.hasValidDates(input);
      let days = 0;
      let quarters = 0;

      if (hasDates) {
        days = Provision.calculateDays(input.tglBerlaku, input.tglBerakhir);
        quarters = Provision.calculateQuarters(input.tglBerlaku, input.tglBerakhir);
      } else if (input.tarifKhusus) {
        if (input.basisKhusus === 'annum') {
          days = input.manualHari || 0;
        } else {
          quarters = input.manualKuartal || 0;
        }
      }

      return { days: days, quarters: quarters, hasDates: hasDates };
    },

    /**
     * Hitung provisi dan total biaya sesuai RULES.md.
     * Asumsi: input sudah valid.
     */
    calculate(input) {
      const isKontra = input.cover === COVER_KONTRA;
      const isRekening = input.cover === COVER_REKENING;
      const period = Provision.resolvePeriod(input);
      let rate;
      let nilaiProvisiRaw;
      let rateLabel;
      let useAnnum = isKontra;

      if (isRekening) {
        nilaiProvisiRaw = REKENING_PROVISI_FIXED;
        rate = 0;
        rateLabel = 'Fixed ' + formatRupiah(REKENING_PROVISI_FIXED) + ' (Rekening Setoran Jaminan)';
      } else if (input.tarifKhusus) {
        rate = input.rateKhusus;
        useAnnum = input.basisKhusus === 'annum';
        if (rate === 0) {
          nilaiProvisiRaw = 0;
          rateLabel = '0% (tarif khusus)';
        } else if (useAnnum) {
          nilaiProvisiRaw = Math.round(input.nilaiBG * (rate / 100) * period.days / 360);
          rateLabel = formatRate(rate, 'per annum') + ' (tarif khusus)';
        } else {
          nilaiProvisiRaw = Math.round(input.nilaiBG * (rate / 100) * period.quarters);
          rateLabel = formatRate(rate, 'per kuartal') + ' (tarif khusus)';
        }
      } else if (isKontra) {
        rate = KONTRA_RATE_ANNUAL;
        nilaiProvisiRaw = Math.round(input.nilaiBG * (rate / 100) * period.days / 360);
        rateLabel = formatRate(rate, 'per annum');
      } else {
        rate = Provision.getRate(input.cover, input.jenisBG);
        nilaiProvisiRaw = Math.round(input.nilaiBG * (rate / 100) * period.quarters);
        rateLabel = formatRate(rate, 'per kuartal');
      }

      const minProvisi = resolveMinimumProvisi(input);
      let nilaiProvisi = nilaiProvisiRaw;
      if (!isRekening && minProvisi > 0 && nilaiProvisiRaw < minProvisi) {
        nilaiProvisi = minProvisi;
      }

      const biayaAdmin = resolveAdminFee(input);
      const biayaFormat = input.formatKhusus ? FORMAT_KHUSUS_FEE : 0;
      const totalBiaya = nilaiProvisi + biayaAdmin + biayaFormat;
      const applicants = Provision.splitProvisi(nilaiProvisi, input.applicants);

      return {
        jumlahHari: period.days,
        jumlahKuartal: period.quarters,
        rate: rate,
        rateLabel: rateLabel,
        nilaiProvisiRaw: nilaiProvisiRaw,
        nilaiProvisi: nilaiProvisi,
        minProvisiUsed: minProvisi,
        minimumApplied: !isRekening && minProvisi > 0 && nilaiProvisiRaw < minProvisi,
        biayaAdmin: biayaAdmin,
        biayaFormat: biayaFormat,
        totalBiaya: totalBiaya,
        isKontra: isKontra,
        isRekening: isRekening,
        isTarifKhusus: input.tarifKhusus,
        useAnnum: useAnnum,
        hasDates: period.hasDates,
        applicants: applicants
      };
    }
  };

  // ─── UI ────────────────────────────────────────────────────────

  const UI = {
    els: {},

    cacheElements() {
      UI.els = {
        saveIndicator: document.getElementById('saveIndicator'),
        navBtns: document.querySelectorAll('.nav-btn'),
        views: document.querySelectorAll('.view'),
        dashboardFilters: document.getElementById('dashboardFilters'),
        notepadFilters: document.getElementById('notepadFilters'),
        statTotalAplikasi: document.getElementById('statTotalAplikasi'),
        statTotalNilaiBG: document.getElementById('statTotalNilaiBG'),
        statTotalProvisi: document.getElementById('statTotalProvisi'),
        statTotalPending: document.getElementById('statTotalPending'),
        statTotalProcess: document.getElementById('statTotalProcess'),
        statTotalDone: document.getElementById('statTotalDone'),
        notepadSearch: document.getElementById('notepadSearch'),
        btnAddRow: document.getElementById('btnAddRow'),
        notepadBody: document.getElementById('notepadBody'),
        notepadEmpty: document.getElementById('notepadEmpty'),
        notepadTable: document.getElementById('notepadTable'),
        deleteModal: document.getElementById('deleteModal'),
        deleteModalDesc: document.getElementById('deleteModalDesc'),
        deleteCancel: document.getElementById('deleteCancel'),
        deleteConfirm: document.getElementById('deleteConfirm'),
        calcApplicantsList: document.getElementById('calcApplicantsList'),
        btnAddApplicant: document.getElementById('btnAddApplicant'),
        calcCover: document.getElementById('calcCover'),
        calcJenisBG: document.getElementById('calcJenisBG'),
        calcNilaiBG: document.getElementById('calcNilaiBG'),
        calcTarifKhusus: document.getElementById('calcTarifKhusus'),
        calcTarifKhususFields: document.getElementById('calcTarifKhususFields'),
        calcRateKhusus: document.getElementById('calcRateKhusus'),
        calcBasisKhusus: document.getElementById('calcBasisKhusus'),
        calcMinProvisi: document.getElementById('calcMinProvisi'),
        rowManualKuartal: document.getElementById('rowManualKuartal'),
        calcManualKuartal: document.getElementById('calcManualKuartal'),
        rowManualHari: document.getElementById('rowManualHari'),
        calcManualHari: document.getElementById('calcManualHari'),
        calcTglBerlaku: document.getElementById('calcTglBerlaku'),
        calcTglBerakhir: document.getElementById('calcTglBerakhir'),
        hintTglBerlaku: document.getElementById('hintTglBerlaku'),
        hintTglBerakhir: document.getElementById('hintTglBerakhir'),
        calcGratisAdmin: document.getElementById('calcGratisAdmin'),
        calcMgt: document.getElementById('calcMgt'),
        calcFormatKhusus: document.getElementById('calcFormatKhusus'),
        btnSaveToNotepad: document.getElementById('btnSaveToNotepad'),
        rowHari: document.getElementById('rowHari'),
        rowKuartal: document.getElementById('rowKuartal'),
        rowMinimum: document.getElementById('rowMinimum'),
        resMinimum: document.getElementById('resMinimum'),
        resApplicants: document.getElementById('resApplicants'),
        resHari: document.getElementById('resHari'),
        resKuartal: document.getElementById('resKuartal'),
        resRate: document.getElementById('resRate'),
        resProvisi: document.getElementById('resProvisi'),
        resAdmin: document.getElementById('resAdmin'),
        resFormat: document.getElementById('resFormat'),
        resTotal: document.getElementById('resTotal'),
        calcErrors: {
          applicants: document.getElementById('errApplicants'),
          cover: document.getElementById('errCover'),
          jenisBG: document.getElementById('errJenisBG'),
          nilaiBG: document.getElementById('errNilaiBG'),
          rateKhusus: document.getElementById('errRateKhusus'),
          minProvisiKhusus: document.getElementById('errMinProvisi'),
          manualKuartal: document.getElementById('errManualKuartal'),
          manualHari: document.getElementById('errManualHari'),
          tglBerlaku: document.getElementById('errTglBerlaku'),
          tglBerakhir: document.getElementById('errTglBerakhir')
        }
      };
    },

    showSaveStatus(status) {
      const el = UI.els.saveIndicator;
      if (!el) return;
      el.className = 'save-indicator ' + status;
      if (status === 'saving') {
        el.textContent = 'Menyimpan...';
      } else if (status === 'saved') {
        el.textContent = 'Tersimpan';
        setTimeout(function () {
          if (el.classList.contains('saved')) {
            el.textContent = '';
            el.className = 'save-indicator';
          }
        }, 2000);
      } else if (status === 'copied') {
        el.textContent = 'Tersalin!';
        el.className = 'save-indicator copied';
        setTimeout(function () {
          if (el.classList.contains('copied')) {
            el.textContent = '';
            el.className = 'save-indicator';
          }
        }, 1500);
      }
    },

    switchView(viewName) {
      state.settings.activeView = viewName;
      Storage.scheduleSave();

      UI.els.navBtns.forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.view === viewName);
      });
      UI.els.views.forEach(function (view) {
        view.classList.toggle('active', view.id === 'view-' + viewName);
      });

      if (viewName === 'dashboard') Dashboard.render();
      if (viewName === 'notepad') Notepad.render();
      if (viewName === 'calculator') {
        Calculator.recalculate();
        requestAnimationFrame(function () {
          const first = UI.els.calcApplicantsList.querySelector('[data-field="name"]');
          if (first) first.focus();
        });
      }
    },

    /** Render filter bar (dipakai dashboard & notepad) */
    renderFilterBar(container) {
      const f = state.settings.filters;
      const cabangList = Data.getUniqueCabang();

      container.innerHTML =
        '<label>Tanggal dari <input type="date" data-filter="tanggalFrom" value="' + escAttr(f.tanggalFrom) + '"></label>' +
        '<label>s/d <input type="date" data-filter="tanggalTo" value="' + escAttr(f.tanggalTo) + '"></label>' +
        '<label>Cabang <select data-filter="cabang"><option value="">Semua</option>' +
        cabangList.map(function (c) {
          return '<option value="' + escAttr(c) + '"' + (f.cabang === c ? ' selected' : '') + '>' + escHtml(c) + '</option>';
        }).join('') +
        '</select></label>' +
        '<label>Jenis BG <select data-filter="jenisBG"><option value="">Semua</option>' +
        JENIS_BG.map(function (j) {
          return '<option value="' + escAttr(j) + '"' + (f.jenisBG === j ? ' selected' : '') + '>' + escHtml(j) + '</option>';
        }).join('') +
        '</select></label>' +
        '<label>Status <select data-filter="status"><option value="">Semua</option>' +
        STATUSES.map(function (s) {
          return '<option value="' + escAttr(s) + '"' + (f.status === s ? ' selected' : '') + '>' + escHtml(s) + '</option>';
        }).join('') +
        '</select></label>' +
        '<button type="button" class="btn filter-reset" data-action="reset-filters">Reset Filter</button>';

      container.querySelectorAll('[data-filter]').forEach(function (el) {
        el.addEventListener('change', function () {
          state.settings.filters[el.dataset.filter] = el.value;
          Storage.scheduleSave();
          Dashboard.render();
          Notepad.render();
          UI.syncFilterBars();
        });
        Keyboard.bindEnterNav(el, function () {
          return Array.from(container.querySelectorAll('[data-filter]'));
        });
      });

      container.querySelector('[data-action="reset-filters"]').addEventListener('click', function () {
        state.settings.filters = {
          tanggalFrom: '',
          tanggalTo: '',
          cabang: '',
          jenisBG: '',
          status: ''
        };
        Storage.scheduleSave();
        Dashboard.render();
        Notepad.render();
        UI.syncFilterBars();
      });
    },

    /** Sinkronkan kedua filter bar setelah perubahan */
    syncFilterBars() {
      UI.renderFilterBar(UI.els.dashboardFilters);
      UI.renderFilterBar(UI.els.notepadFilters);
    },

    showDeleteModal(app) {
      pendingDeleteId = app.id;
      UI.els.deleteModalDesc.textContent =
        (app.applicant || '(tanpa applicant)') + ' — ' + (app.namaFile || '');
      UI.els.deleteModal.classList.remove('hidden');
      UI.els.deleteConfirm.focus();
    },

    hideDeleteModal() {
      pendingDeleteId = null;
      UI.els.deleteModal.classList.add('hidden');
    }
  };

  // ─── Dashboard ─────────────────────────────────────────────────

  const Dashboard = {
    render() {
      const stats = Data.getDashboardStats();
      UI.els.statTotalAplikasi.textContent = stats.totalAplikasi;
      UI.els.statTotalNilaiBG.textContent = formatRupiah(stats.totalNilaiBG);
      UI.els.statTotalProvisi.textContent = formatRupiah(stats.totalProvisi);
      UI.els.statTotalPending.textContent = stats.totalPending;
      UI.els.statTotalProcess.textContent = stats.totalProcess;
      UI.els.statTotalDone.textContent = stats.totalDone;
    }
  };

  // ─── Notepad ───────────────────────────────────────────────────

  const Notepad = {
    /** Urutan fokus field di tabel notepad (per baris, kiri ke kanan) */
    getTabOrder() {
      const order = [];
      UI.els.notepadBody.querySelectorAll('tr').forEach(function (row) {
        row.querySelectorAll('[data-field]').forEach(function (el) {
          if (el.readOnly || el.dataset.action === 'copy-namafile') return;
          order.push(el);
        });
      });
      return order;
    },

    focusNextField(current) {
      if (current && current.blur) current.blur();
      requestAnimationFrame(function () {
        const order = Notepad.getTabOrder();
        const idx = order.indexOf(current);
        if (idx >= 0 && idx < order.length - 1) {
          const next = order[idx + 1];
          next.focus();
          if (next.select && next.type !== 'checkbox' && next.tagName !== 'SELECT') {
            try { next.select(); } catch (_) { /* noop */ }
          }
        } else if (idx === order.length - 1) {
          Notepad.addRow();
        }
      });
    },

    /** Fokus ke input pertama baris baru */
    focusNewRow(id) {
      requestAnimationFrame(function () {
        const row = document.querySelector('tr[data-id="' + id + '"]');
        if (row) {
          const input = row.querySelector('[data-field="applicant"]');
          if (input) input.focus();
        }
      });
    },

    render() {
      const apps = Data.getNotepadApplications();
      const tbody = UI.els.notepadBody;
      const isEmpty = apps.length === 0;

      UI.els.notepadEmpty.classList.toggle('hidden', !isEmpty);
      UI.els.notepadTable.classList.toggle('hidden', isEmpty);

      tbody.innerHTML = apps.map(Notepad.renderRow).join('');

      Notepad.updateSortHeaders();
      Notepad.bindRowEvents();
    },

    renderRow(app) {
      return '<tr data-id="' + escAttr(app.id) + '">' +
        '<td class="col-action"><button type="button" class="btn btn-icon btn-danger" data-action="delete" title="Hapus baris">✕</button></td>' +
        '<td><input type="date" class="cell-input" data-field="tanggal" value="' + escAttr(app.tanggal) + '"></td>' +
        '<td><input type="text" class="cell-input" data-field="applicant" value="' + escAttr(app.applicant) + '" autocomplete="off"></td>' +
        '<td><input type="text" class="cell-input" data-field="nilaiBG" value="' + escAttr(formatRupiah(app.nilaiBG)) + '" autocomplete="off"></td>' +
        '<td><input type="text" class="cell-input" data-field="noBG" value="' + escAttr(app.noBG) + '" autocomplete="off"></td>' +
        '<td><input type="text" class="cell-input" data-field="noRegistrasi" value="' + escAttr(app.noRegistrasi) + '" autocomplete="off"></td>' +
        '<td><input type="text" class="cell-input readonly cell-copy" data-field="namaFile" data-action="copy-namafile" value="' + escAttr(app.namaFile) + '" readonly tabindex="-1" title="Klik untuk salin"></td>' +
        '<td><input type="text" class="cell-input" data-field="noAplikasi" value="' + escAttr(app.noAplikasi) + '" autocomplete="off"></td>' +
        '<td><input type="text" class="cell-input" data-field="nilaiProvisi" value="' + escAttr(formatRupiah(app.nilaiProvisi)) + '" autocomplete="off"></td>' +
        '<td><input type="text" class="cell-input" data-field="kodeCabang" value="' + escAttr(app.kodeCabang) + '" autocomplete="off"></td>' +
        '<td><input type="text" class="cell-input" data-field="namaCabang" value="' + escAttr(app.namaCabang) + '" autocomplete="off"></td>' +
        '<td>' + Notepad.renderSelect('jenisBG', JENIS_BG, app.jenisBG, true) + '</td>' +
        '<td>' + Notepad.renderSelect('status', STATUSES, app.status, false, 'status-' + escAttr(app.status)) + '</td>' +
        '<td><input type="text" class="cell-input" data-field="note" value="' + escAttr(app.note) + '" autocomplete="off"></td>' +
        '</tr>';
    },

    renderSelect(field, options, current, allowEmpty, extraClass) {
      let html = '<select class="cell-select' + (extraClass ? ' ' + extraClass : '') + '" data-field="' + field + '">';
      if (allowEmpty) {
        html += '<option value=""' + (current === '' ? ' selected' : '') + '>—</option>';
      }
      options.forEach(function (opt) {
        html += '<option value="' + escAttr(opt) + '"' + (current === opt ? ' selected' : '') + '>' + escHtml(opt) + '</option>';
      });
      html += '</select>';
      return html;
    },

    updateSortHeaders() {
      document.querySelectorAll('#notepadTable th.sortable').forEach(function (th) {
        const field = th.dataset.sort;
        const label = th.dataset.label || field;
        let arrow = '';
        if (field === state.settings.sortField) {
          arrow = state.settings.sortDir === 'asc' ? ' ▲' : ' ▼';
        }
        th.innerHTML = escHtml(label) + '<span class="sort-arrow">' + arrow + '</span>';
      });
    },

    bindRowEvents() {
      const tbody = UI.els.notepadBody;

      tbody.querySelectorAll('[data-field]').forEach(function (el) {
        const row = el.closest('tr');
        const id = row.dataset.id;
        const field = el.dataset.field;

        if (el.readOnly && el.dataset.action !== 'copy-namafile') return;

        if (el.dataset.action === 'copy-namafile') {
          el.addEventListener('click', function () {
            const text = el.value;
            if (!text) return;
            copyToClipboard(text).then(function () {
              UI.showSaveStatus('copied');
              el.classList.add('cell-copied');
              setTimeout(function () { el.classList.remove('cell-copied'); }, 400);
            });
          });
          return;
        }

        if (field === 'nilaiBG' || field === 'nilaiProvisi') {
          el.addEventListener('focus', function () {
            const app = Data.findById(id);
            if (app) el.value = app[field] || 0;
          });
          el.addEventListener('blur', function () {
            Data.updateField(id, field, el.value);
            const app = Data.findById(id);
            if (app) el.value = formatRupiah(app[field]);
            if (field === 'nilaiBG') {
              const namaFileInput = row.querySelector('[data-field="namaFile"]');
              if (namaFileInput && app) namaFileInput.value = app.namaFile;
            }
            Dashboard.render();
          });
        } else if (el.tagName === 'SELECT') {
          el.addEventListener('change', function () {
            Data.updateField(id, field, el.value);
            if (field === 'status') {
              el.className = 'cell-select status-' + el.value;
            }
            Dashboard.render();
            if (field === 'namaCabang') UI.syncFilterBars();
          });
        } else if (el.type === 'date') {
          el.addEventListener('change', function () {
            Data.updateField(id, field, el.value);
            Dashboard.render();
          });
        } else {
          el.addEventListener('blur', function () {
            Data.updateField(id, field, el.value);
            if (['applicant', 'noBG', 'noRegistrasi'].indexOf(field) !== -1) {
              const app = Data.findById(id);
              const namaFileInput = row.querySelector('[data-field="namaFile"]');
              if (namaFileInput && app) namaFileInput.value = app.namaFile;
            }
            Dashboard.render();
            if (field === 'namaCabang') UI.syncFilterBars();
          });
        }

        el.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter' || e.shiftKey) return;
          e.preventDefault();
          Notepad.focusNextField(el);
        });
      });

      tbody.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const id = btn.closest('tr').dataset.id;
          const app = Data.findById(id);
          if (app) UI.showDeleteModal(app);
        });
      });
    },

    addRow() {
      const app = Data.addApplication();
      Notepad.render();
      Dashboard.render();
      UI.syncFilterBars();
      Notepad.focusNewRow(app.id);
    },

    confirmDelete() {
      if (!pendingDeleteId) return;
      Data.deleteApplication(pendingDeleteId);
      UI.hideDeleteModal();
      Notepad.render();
      Dashboard.render();
      UI.syncFilterBars();
    }
  };

  // ─── Calculator (UI Kalkulator Provisi) ──────────────────────

  const Calculator = {
    /** Render satu baris applicant */
    renderApplicantRow(name, pct, showPct, showRemove) {
      return '<div class="calc-applicant-item">' +
        '<input type="text" class="form-input" data-field="name" value="' + escAttr(name) + '" placeholder="Nama Applicant" autocomplete="off">' +
        '<span class="calc-pct-wrap' + (showPct ? '' : ' hidden') + '">' +
        '<input type="number" class="form-input calc-pct-input" data-field="pct" value="' + (showPct ? pct : 100) + '" min="0" max="100" step="1">' +
        '<span class="pct-label">%</span></span>' +
        '<button type="button" class="btn btn-icon btn-danger' + (showRemove ? '' : ' hidden') + '" data-action="remove-applicant" title="Hapus">✕</button>' +
        '</div>';
    },

    /** Inisialisasi daftar applicant (1 baris default) */
    initApplicants() {
      UI.els.calcApplicantsList.innerHTML = Calculator.renderApplicantRow('', 100, false, true);
      Calculator.bindApplicantEvents();
    },

    /** Update tampilan kolom % saat jumlah applicant berubah */
    updateApplicantPctVisibility() {
      const items = UI.els.calcApplicantsList.querySelectorAll('.calc-applicant-item');
      const multi = items.length > 1;
      items.forEach(function (row) {
        row.querySelector('.calc-pct-wrap').classList.toggle('hidden', !multi);
        const removeBtn = row.querySelector('[data-action="remove-applicant"]');
        if (removeBtn) removeBtn.classList.toggle('hidden', !multi);
      });
    },

    /** Bind event pada baris applicant */
    bindApplicantEvents() {
      UI.els.calcApplicantsList.querySelectorAll('[data-field]').forEach(function (el) {
        el.removeEventListener('input', Calculator.recalculate);
        el.addEventListener('input', Calculator.recalculate);
        el.removeEventListener('change', Calculator.recalculate);
        el.addEventListener('change', Calculator.recalculate);
        Calculator.bindEnterNav(el);
      });
      UI.els.calcApplicantsList.querySelectorAll('[data-action="remove-applicant"]').forEach(function (btn) {
        btn.onclick = function () {
          btn.closest('.calc-applicant-item').remove();
          Calculator.updateApplicantPctVisibility();
          Calculator.recalculate();
        };
      });
    },

    addApplicantRow() {
      const items = UI.els.calcApplicantsList.querySelectorAll('.calc-applicant-item');
      const count = items.length + 1;
      const div = document.createElement('div');
      div.innerHTML = Calculator.renderApplicantRow('', Math.floor(100 / count), true, true);
      UI.els.calcApplicantsList.appendChild(div.firstChild);
      Calculator.updateApplicantPctVisibility();
      Calculator.bindApplicantEvents();
      Calculator.recalculate();
      const last = UI.els.calcApplicantsList.querySelector('.calc-applicant-item:last-child [data-field="name"]');
      if (last) last.focus();
    },

    /** Baca applicants dari DOM */
    getApplicantsFromDOM() {
      const items = UI.els.calcApplicantsList.querySelectorAll('.calc-applicant-item');
      return Array.from(items).map(function (row) {
        const multi = items.length > 1;
        return {
          name: row.querySelector('[data-field="name"]').value,
          pct: multi ? (parseInt(row.querySelector('[data-field="pct"]').value, 10) || 0) : 100
        };
      });
    },

    /** Urutan fokus field kalkulator */
    getTabOrder() {
      const order = [];
      UI.els.calcApplicantsList.querySelectorAll('[data-field]').forEach(function (el) {
        order.push(el);
      });
      order.push(UI.els.btnAddApplicant);
      order.push(
        UI.els.calcCover,
        UI.els.calcJenisBG,
        UI.els.calcNilaiBG,
        UI.els.calcTarifKhusus
      );
      if (UI.els.calcTarifKhusus.checked) {
        order.push(UI.els.calcRateKhusus, UI.els.calcBasisKhusus, UI.els.calcMinProvisi);
        if (!UI.els.rowManualKuartal.classList.contains('hidden')) {
          order.push(UI.els.calcManualKuartal);
        }
        if (!UI.els.rowManualHari.classList.contains('hidden')) {
          order.push(UI.els.calcManualHari);
        }
      }
      order.push(
        UI.els.calcTglBerlaku,
        UI.els.calcTglBerakhir,
        UI.els.calcGratisAdmin,
        UI.els.calcMgt,
        UI.els.calcFormatKhusus,
        UI.els.btnSaveToNotepad
      );
      return order;
    },

    focusNextField(current) {
      if (current === UI.els.btnSaveToNotepad && !UI.els.btnSaveToNotepad.disabled) {
        Calculator.saveToNotepad();
        return;
      }
      if (current && current.blur) current.blur();
      requestAnimationFrame(function () {
        const orderNow = Calculator.getTabOrder();
        const idxNow = orderNow.indexOf(current);
        if (idxNow >= 0 && idxNow < orderNow.length - 1) {
          const next = orderNow[idxNow + 1];
          next.focus();
          if (next.select && next.type !== 'checkbox' && next.tagName !== 'SELECT') {
            try { next.select(); } catch (_) { /* noop */ }
          }
        }
      });
    },

    /** Toggle panel tarif khusus & opsional tanggal */
    toggleTarifKhusus() {
      const on = UI.els.calcTarifKhusus.checked;
      UI.els.calcTarifKhususFields.classList.toggle('hidden', !on);
      const hint = on ? '(opsional)' : '';
      UI.els.hintTglBerlaku.textContent = hint;
      UI.els.hintTglBerakhir.textContent = hint;
      if (on && !UI.els.calcMinProvisi.dataset.raw && !UI.els.calcMinProvisi.value.trim()) {
        UI.els.calcMinProvisi.dataset.raw = MINIMUM_PROVISI;
        UI.els.calcMinProvisi.value = formatNumberDots(MINIMUM_PROVISI);
      }
      Calculator.updateManualFields();
      Calculator.recalculate();
    },

    /** Tampilkan field manual kuartal/hari jika tarif khusus tanpa tanggal */
    updateManualFields() {
      if (!UI.els.calcTarifKhusus.checked) {
        UI.els.rowManualKuartal.classList.add('hidden');
        UI.els.rowManualHari.classList.add('hidden');
        return;
      }
      const hasDates = UI.els.calcTglBerlaku.value.trim() || UI.els.calcTglBerakhir.value.trim();
      const isAnnum = UI.els.calcBasisKhusus.value === 'annum';
      UI.els.rowManualKuartal.classList.toggle('hidden', hasDates || isAnnum);
      UI.els.rowManualHari.classList.toggle('hidden', hasDates || !isAnnum);
    },

    /** Baca nilai form kalkulator */
    getInput() {
      const tglBerlakuDisplay = UI.els.calcTglBerlaku.value.trim();
      const tglBerakhirDisplay = UI.els.calcTglBerakhir.value.trim();

      return {
        applicants: Calculator.getApplicantsFromDOM(),
        cover: UI.els.calcCover.value,
        jenisBG: UI.els.calcJenisBG.value,
        nilaiBG: parseNumber(UI.els.calcNilaiBG.dataset.raw || UI.els.calcNilaiBG.value),
        tarifKhusus: UI.els.calcTarifKhusus.checked,
        rateKhususStr: UI.els.calcRateKhusus.value.trim(),
        rateKhusus: parseRate(UI.els.calcRateKhusus.value),
        basisKhusus: UI.els.calcBasisKhusus.value,
        minProvisiKhususStr: UI.els.calcMinProvisi.value.trim(),
        minProvisiKhusus: parseNumber(UI.els.calcMinProvisi.dataset.raw || UI.els.calcMinProvisi.value),
        manualKuartal: parseInt(UI.els.calcManualKuartal.value, 10) || 0,
        manualHari: parseInt(UI.els.calcManualHari.value, 10) || 0,
        tglBerlakuDisplay: tglBerlakuDisplay,
        tglBerakhirDisplay: tglBerakhirDisplay,
        tglBerlaku: ddmmyyyyToISO(tglBerlakuDisplay),
        tglBerakhir: ddmmyyyyToISO(tglBerakhirDisplay),
        gratisAdmin: UI.els.calcGratisAdmin.checked,
        mgt: UI.els.calcMgt.checked,
        formatKhusus: UI.els.calcFormatKhusus.checked
      };
    },

    /** Tampilkan / sembunyikan pesan error per field */
    showErrors(errors) {
      const fieldMap = {
        cover: UI.els.calcCover,
        jenisBG: UI.els.calcJenisBG,
        nilaiBG: UI.els.calcNilaiBG,
        rateKhusus: UI.els.calcRateKhusus,
        minProvisiKhusus: UI.els.calcMinProvisi,
        manualKuartal: UI.els.calcManualKuartal,
        manualHari: UI.els.calcManualHari,
        tglBerlaku: UI.els.calcTglBerlaku,
        tglBerakhir: UI.els.calcTglBerakhir
      };

      Object.keys(UI.els.calcErrors).forEach(function (key) {
        const errEl = UI.els.calcErrors[key];
        const inputEl = fieldMap[key];
        const msg = errors[key];

        if (msg) {
          errEl.textContent = msg;
          errEl.classList.remove('hidden');
          if (inputEl) inputEl.classList.add('input-error');
        } else {
          errEl.textContent = '';
          errEl.classList.add('hidden');
          if (inputEl) inputEl.classList.remove('input-error');
        }
      });

      UI.els.calcApplicantsList.querySelectorAll('[data-field="name"]').forEach(function (el) {
        el.classList.toggle('input-error', !!errors.applicants);
      });
    },

    clearResults() {
      lastCalcResult = null;
      UI.els.resHari.textContent = '—';
      UI.els.resKuartal.textContent = '—';
      UI.els.resRate.textContent = '—';
      UI.els.resProvisi.textContent = '—';
      UI.els.resAdmin.textContent = '—';
      UI.els.resFormat.textContent = '—';
      UI.els.resTotal.textContent = '—';
      UI.els.resApplicants.innerHTML = '';
      UI.els.rowMinimum.classList.add('hidden');
      UI.els.rowHari.classList.remove('hidden');
      UI.els.rowKuartal.classList.remove('hidden');
      UI.els.btnSaveToNotepad.disabled = true;
    },

    showResults(result) {
      lastCalcResult = result;
      UI.els.resRate.textContent = result.rateLabel;
      UI.els.resProvisi.textContent = formatRupiah(result.nilaiProvisi);
      UI.els.resAdmin.textContent = formatRupiah(result.biayaAdmin);
      UI.els.resFormat.textContent = formatRupiah(result.biayaFormat);
      UI.els.resTotal.textContent = formatRupiah(result.totalBiaya);
      UI.els.btnSaveToNotepad.disabled = false;

      if (result.isRekening) {
        UI.els.rowHari.classList.add('hidden');
        UI.els.rowKuartal.classList.add('hidden');
      } else if (result.useAnnum) {
        UI.els.rowHari.classList.remove('hidden');
        UI.els.rowKuartal.classList.add('hidden');
        UI.els.resHari.textContent = result.jumlahHari ? result.jumlahHari + ' hari' : '—';
      } else {
        UI.els.rowHari.classList.toggle('hidden', !result.jumlahHari);
        UI.els.rowKuartal.classList.remove('hidden');
        if (result.jumlahHari) UI.els.resHari.textContent = result.jumlahHari + ' hari';
        UI.els.resKuartal.textContent = result.jumlahKuartal ? result.jumlahKuartal + ' kuartal' : '—';
      }

      if (result.minimumApplied) {
        UI.els.rowMinimum.classList.remove('hidden');
        UI.els.resMinimum.textContent = formatRupiah(result.minProvisiUsed) +
          ' (dari ' + formatRupiah(result.nilaiProvisiRaw) + ')';
      } else {
        UI.els.rowMinimum.classList.add('hidden');
      }

      UI.els.resApplicants.innerHTML = result.applicants.map(function (a) {
        const pctLabel = result.applicants.length > 1
          ? '<span class="calc-applicant-pct">(' + a.pct + '%)</span>' : '';
        return '<div class="calc-applicant-row">' +
          '<span class="calc-applicant-name" title="' + escAttr(a.name) + '">' +
          escHtml(a.name) + pctLabel + '</span>' +
          '<span class="result-value">' + formatRupiah(a.provisi) + '</span>' +
          '</div>';
      }).join('');
    },

    recalculate() {
      Calculator.updateManualFields();
      const input = Calculator.getInput();
      const validation = Provision.validate(input);
      Calculator.showErrors(validation.errors);
      if (!validation.valid) {
        Calculator.clearResults();
        return;
      }
      Calculator.showResults(Provision.calculate(input));
    },

    saveToNotepad() {
      const input = Calculator.getInput();
      const validation = Provision.validate(input);
      if (!validation.valid) {
        Calculator.showErrors(validation.errors);
        Calculator.clearResults();
        return;
      }
      const result = lastCalcResult || Provision.calculate(input);
      let focusId = null;
      result.applicants.forEach(function (a) {
        const app = Data.saveFromCalculator({
          applicant: a.name,
          nilaiBG: input.nilaiBG,
          nilaiProvisi: a.provisi,
          jenisBG: input.jenisBG
        });
        if (!focusId) focusId = app.id;
      });
      Notepad.render();
      Dashboard.render();
      UI.syncFilterBars();
      UI.switchView('notepad');
      if (focusId) Notepad.focusNewRow(focusId);
    },

    onDateInput(el) {
      const pos = el.selectionStart;
      const prevLen = el.value.length;
      el.value = autoFormatDateInput(el.value);
      el.setSelectionRange(
        Math.max(0, pos + (el.value.length - prevLen)),
        Math.max(0, pos + (el.value.length - prevLen))
      );
      Calculator.updateManualFields();
      Calculator.recalculate();
    },

    bindEnterNav(el) {
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          Calculator.focusNextField(el);
        }
      });
    },

    bindEvents() {
      Calculator.initApplicants();
      UI.els.btnAddApplicant.addEventListener('click', Calculator.addApplicantRow);
      Calculator.bindEnterNav(UI.els.btnAddApplicant);
      Calculator.bindEnterNav(UI.els.calcTarifKhusus);
      Calculator.bindEnterNav(UI.els.btnSaveToNotepad);

      [UI.els.calcCover, UI.els.calcJenisBG].forEach(function (el) {
        el.addEventListener('input', Calculator.recalculate);
        el.addEventListener('change', Calculator.recalculate);
        Calculator.bindEnterNav(el);
      });

      UI.els.calcTarifKhusus.addEventListener('change', Calculator.toggleTarifKhusus);
      UI.els.calcRateKhusus.addEventListener('input', Calculator.recalculate);
      UI.els.calcBasisKhusus.addEventListener('change', function () {
        Calculator.updateManualFields();
        Calculator.recalculate();
      });
      Calculator.bindEnterNav(UI.els.calcRateKhusus);
      Calculator.bindEnterNav(UI.els.calcBasisKhusus);

      UI.els.calcMinProvisi.addEventListener('focus', function () {
        const raw = UI.els.calcMinProvisi.dataset.raw || parseNumber(UI.els.calcMinProvisi.value);
        UI.els.calcMinProvisi.value = raw || '';
      });
      UI.els.calcMinProvisi.addEventListener('blur', function () {
        const num = parseNumber(UI.els.calcMinProvisi.value);
        UI.els.calcMinProvisi.dataset.raw = num;
        UI.els.calcMinProvisi.value = num > 0 ? formatNumberDots(num) : '';
        Calculator.recalculate();
      });
      UI.els.calcMinProvisi.addEventListener('input', function () {
        UI.els.calcMinProvisi.value = UI.els.calcMinProvisi.value.replace(/[^\d]/g, '');
        UI.els.calcMinProvisi.dataset.raw = parseNumber(UI.els.calcMinProvisi.value);
        Calculator.recalculate();
      });
      Calculator.bindEnterNav(UI.els.calcMinProvisi);

      UI.els.calcManualKuartal.addEventListener('input', Calculator.recalculate);
      UI.els.calcManualHari.addEventListener('input', Calculator.recalculate);
      Calculator.bindEnterNav(UI.els.calcManualKuartal);
      Calculator.bindEnterNav(UI.els.calcManualHari);

      UI.els.calcGratisAdmin.addEventListener('change', Calculator.recalculate);
      UI.els.calcMgt.addEventListener('change', Calculator.recalculate);
      UI.els.calcFormatKhusus.addEventListener('change', Calculator.recalculate);
      Calculator.bindEnterNav(UI.els.calcGratisAdmin);
      Calculator.bindEnterNav(UI.els.calcMgt);
      Calculator.bindEnterNav(UI.els.calcFormatKhusus);

      UI.els.calcNilaiBG.addEventListener('focus', function () {
        const raw = UI.els.calcNilaiBG.dataset.raw || parseNumber(UI.els.calcNilaiBG.value);
        UI.els.calcNilaiBG.value = raw || '';
      });
      UI.els.calcNilaiBG.addEventListener('blur', function () {
        const num = parseNumber(UI.els.calcNilaiBG.value);
        UI.els.calcNilaiBG.dataset.raw = num;
        UI.els.calcNilaiBG.value = num > 0 ? formatNumberDots(num) : '';
        Calculator.recalculate();
      });
      UI.els.calcNilaiBG.addEventListener('input', function () {
        UI.els.calcNilaiBG.value = UI.els.calcNilaiBG.value.replace(/[^\d]/g, '');
        UI.els.calcNilaiBG.dataset.raw = parseNumber(UI.els.calcNilaiBG.value);
        Calculator.recalculate();
      });
      Calculator.bindEnterNav(UI.els.calcNilaiBG);

      [UI.els.calcTglBerlaku, UI.els.calcTglBerakhir].forEach(function (el) {
        el.addEventListener('input', function () { Calculator.onDateInput(el); });
        el.addEventListener('blur', Calculator.recalculate);
        Calculator.bindEnterNav(el);
      });

      UI.els.btnSaveToNotepad.addEventListener('click', Calculator.saveToNotepad);
    }
  };

  // ─── Escape helpers ────────────────────────────────────────────

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(str) {
    return escHtml(str).replace(/'/g, '&#39;');
  }

  // ─── App (bootstrap & events) ────────────────────────────────

  const App = {
    init() {
      state = Storage.load();
      UI.cacheElements();

      UI.renderFilterBar(UI.els.dashboardFilters);
      UI.renderFilterBar(UI.els.notepadFilters);

      UI.els.notepadSearch.value = state.settings.notepadSearch || '';

      App.bindEvents();
      Calculator.bindEvents();

      UI.switchView(state.settings.activeView || 'dashboard');
    },

    bindEvents() {
      UI.els.navBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          UI.switchView(btn.dataset.view);
        });
      });

      UI.els.btnAddRow.addEventListener('click', function () {
        Notepad.addRow();
      });

      UI.els.notepadSearch.addEventListener('input', function () {
        state.settings.notepadSearch = UI.els.notepadSearch.value;
        Storage.scheduleSave();
        Notepad.render();
      });

      Keyboard.bindEnterNav(UI.els.notepadSearch, function () {
        const order = [UI.els.notepadSearch];
        const first = Notepad.getTabOrder()[0];
        if (first) order.push(first);
        return order;
      }, function (el) {
        const first = Notepad.getTabOrder()[0];
        if (first) {
          el.blur();
          requestAnimationFrame(function () { first.focus(); });
        }
        return true;
      });

      document.querySelectorAll('#notepadTable th.sortable').forEach(function (th) {
        th.addEventListener('click', function () {
          const field = th.dataset.sort;
          if (state.settings.sortField === field) {
            state.settings.sortDir = state.settings.sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            state.settings.sortField = field;
            state.settings.sortDir = field === 'tanggal' ? 'desc' : 'asc';
          }
          Storage.scheduleSave();
          Notepad.render();
        });
      });

      UI.els.deleteCancel.addEventListener('click', UI.hideDeleteModal);
      UI.els.deleteConfirm.addEventListener('click', Notepad.confirmDelete);

      UI.els.deleteModal.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          Notepad.confirmDelete();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          UI.hideDeleteModal();
        }
      });

      window.addEventListener('keydown', function (e) {
        if (!UI.els.deleteModal.classList.contains('hidden')) return;

        if (Keyboard.isMod(e, 'KeyN')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (state.settings.activeView !== 'notepad') UI.switchView('notepad');
          Notepad.addRow();
          return;
        }
        if (Keyboard.isMod(e, 'KeyF')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (state.settings.activeView !== 'notepad') UI.switchView('notepad');
          UI.els.notepadSearch.focus();
          UI.els.notepadSearch.select();
        }
      }, true);
    }
  };

  document.addEventListener('DOMContentLoaded', App.init);

  return { App: App, Storage: Storage, Data: Data, Provision: Provision };
})();
