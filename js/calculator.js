/**
 * calculator.js — Kalkulator Simulasi Tarif KADENA Gestun
 *
 * Fetch data dari fee-config.json lalu:
 * 1. Populate dropdown kalkulator (flat list, tanpa grouping)
 * 2. Hitung fee, potongan, nominal bersih
 * 3. Auto-generate tabel harga (khusus harga.html)
 *
 * Digunakan di: index.html & harga.html
 */

/* ═══════════════════════════════════════════════
   TELEGRAM NOTIFICATION
   ═══════════════════════════════════════════════ */
var TG_BOT_TOKEN = '8706753071:AAEOsCpySEkHMfLUY_Czwq5hypwNo1ybVzc';
var TG_CHAT_ID   = '816305570';

function kirimNotifTelegram(provider, nominal) {
  var waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  var pesan =
    '\uD83D\uDD14 *Kalkulator Gestun Digunakan!*\n\n' +
    '\uD83C\uDFE6 Provider : ' + provider + '\n' +
    '\uD83D\uDCB0 Nominal   : Rp ' + nominal.toLocaleString('id-ID') + '\n' +
    '\u23F0 Waktu     : ' + waktu;

  fetch('https://api.telegram.org/bot' + TG_BOT_TOKEN + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text: pesan, parse_mode: 'Markdown' })
  }).catch(function (err) { console.warn('Notif TG gagal:', err); });
}
/* ═══════════════════════════════════════════════
   END TELEGRAM NOTIFICATION
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  var WA_URL =
    'https://wa.me/6288222267334?text=Halo%20KADENA%2C%20saya%20ingin%20cairkan%20limit%20paylater%2Fkartu%20kredit%20saya.';
  var feeData = null;
  var serviceMap = {};

  /* ═══════════════════════════════════════════════
     DATA LOADING
     ═══════════════════════════════════════════════ */
  function loadFeeData() {
    fetch('fee-config.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        feeData = data;
        buildServiceMap();
        populateDropdowns();
        renderPriceTable();
      })
      .catch(function (err) {
        console.error('Gagal memuat fee-config.json:', err);
        document.querySelectorAll('.calc-error').forEach(function (el) {
          el.textContent = 'Gagal memuat data tarif. Silakan refresh halaman.';
          el.style.display = 'block';
        });
      });
  }

  function buildServiceMap() {
    serviceMap = {};
    feeData.categories.forEach(function (cat) {
      cat.providers.forEach(function (prov) {
        prov.services.forEach(function (svc) {
          serviceMap[svc.service_id] = {
            providerName: prov.provider_name,
            transactionType: svc.transaction_type,
            feePercent: svc.fee_percent,
            processingTime: svc.processing_time,
            label: prov.provider_name + ' \u2014 ' + svc.transaction_type
          };
        });
      });
    });
  }

  /* ═══════════════════════════════════════════════
     DROPDOWN
     ═══════════════════════════════════════════════ */
  function populateDropdowns() {
    document.querySelectorAll('.calc-provider-select').forEach(function (sel) {
      sel.innerHTML =
        '<option value="" disabled selected>Pilih jenis & metode transaksi</option>';

      Object.keys(serviceMap).forEach(function (id) {
        var o = document.createElement('option');
        o.value = id;
        o.textContent = serviceMap[id].label;
        sel.appendChild(o);
      });
    });
  }

  /* ═══════════════════════════════════════════════
     FORMAT HELPERS
     ═══════════════════════════════════════════════ */
  function formatRupiah(n) {
    return 'Rp ' + n.toLocaleString('id-ID');
  }

  function formatInput(inp) {
    var v = inp.value.replace(/[^0-9]/g, '');
    if (v) inp.value = parseInt(v, 10).toLocaleString('id-ID');
  }

  /* ═══════════════════════════════════════════════
     CALCULATE
     ═══════════════════════════════════════════════ */
  function calculate(widget) {
    var sel = widget.querySelector('.calc-provider-select');
    var inp = widget.querySelector('.calc-nominal-input');
    var res = widget.querySelector('.calc-result');
    var err = widget.querySelector('.calc-error');

    err.style.display = 'none';
    res.style.display = 'none';

    if (!sel.value) {
      err.textContent = 'Silakan pilih jenis & metode transaksi.';
      err.style.display = 'block';
      return;
    }

    var nominal = parseFloat(inp.value.replace(/[^0-9]/g, ''));
    if (!nominal || nominal <= 0) {
      err.textContent = 'Silakan masukkan nominal transaksi yang valid.';
      err.style.display = 'block';
      return;
    }

    var svc = serviceMap[sel.value];
    var fee = Math.round(nominal * svc.feePercent / 100);
    var net = nominal - fee;

    widget.querySelector('.calc-net-amount').textContent = formatRupiah(net);
    widget.querySelector('.calc-fee-percent').textContent =
      'Fee ' + svc.feePercent + '%';
    widget.querySelector('.calc-fee-amount').textContent =
      'Jumlah potongan: ' + formatRupiah(fee);
    widget.querySelector('.calc-processing-time').textContent =
      'Estimasi proses: ' + svc.processingTime;

    res.style.display = 'block';

    // Kirim notifikasi Telegram
    kirimNotifTelegram(svc.providerName, nominal);

    res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ═══════════════════════════════════════════════
     INIT CALCULATORS
     ═══════════════════════════════════════════════ */
  function initCalculators() {
    document.querySelectorAll('.calculator-widget').forEach(function (w) {
      var btn = w.querySelector('.calc-btn');
      var inp = w.querySelector('.calc-nominal-input');
      var wa  = w.querySelector('.calc-wa-btn');

      if (btn) {
        btn.addEventListener('click', function () { calculate(w); });
      }

      if (inp) {
        inp.setAttribute('placeholder', 'masukkan angka');
        inp.addEventListener('input', function () { formatInput(inp); });
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); calculate(w); }
        });
      }

      if (wa) {
        wa.addEventListener('click', function () {
          if (typeof trackWAClick === 'function') trackWAClick('kalkulator_cta');
          window.open(WA_URL, '_blank');
        });
      }
    });
  }

  /* ═══════════════════════════════════════════════
     PRICE TABLE — harga.html only
     ═══════════════════════════════════════════════ */
  function renderPriceTable() {
    var tbody = document.getElementById('price-table-body');
    if (!tbody) return; // not on harga.html, skip

    var html = '';
    feeData.categories.forEach(function (cat) {
      cat.providers.forEach(function (prov) {
        prov.services.forEach(function (svc) {
          html +=
            '<tr>' +
            '<td data-label="Provider">' + prov.provider_name + '</td>' +
            '<td data-label="Metode Transaksi">' + svc.transaction_type + '</td>' +
            '<td data-label="Fee">' + svc.fee_percent + '%</td>' +
            '<td data-label="Estimasi Proses">' + svc.processing_time + '</td>' +
            '</tr>';
        });
      });
    });

    tbody.innerHTML = html;
  }

  /* ═══════════════════════════════════════════════
     BOOT
     ═══════════════════════════════════════════════ */
  function boot() {
    loadFeeData();
    initCalculators();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
