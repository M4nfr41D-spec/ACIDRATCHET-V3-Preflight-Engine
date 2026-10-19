<?php
/**
 * Plugin Name:       ACIDRATCHET
 * Description:       ACIDRATCHET Acid-Synth-Suite (Synth, Pattern Studio, FX Lab, Songbook) auf der eigenen Seite – ein Widget mit Menüleiste. Elementor-Widget „ACIDRATCHET“ oder Shortcode [acidratchet].
 * Version:           1.1.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Manfred Foissner
 * License:           Proprietär – alle Rechte vorbehalten
 * Text Domain:       acidratchet
 *
 * App-Stand: {{APPVER}}
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ACIDRATCHET_PLUGIN_VER', '1.1.0' );
define( 'ACIDRATCHET_APP_VER', '{{APPVER}}' );
define( 'ACIDRATCHET_DIR', plugin_dir_path( __FILE__ ) );
define( 'ACIDRATCHET_URL', plugin_dir_url( __FILE__ ) );

/** Werkzeuge der Suite: Schlüssel => [Datei, Anzeigename]. Reihenfolge = Menüleiste. */
function acidratchet_tools() {
	return array(
		'synth'      => array( 'index.html', 'Synth' ),
		'translator' => array( 'ACIDRATCHET_TD3MO_TRANSLATOR.html', 'Pattern Studio' ),
		'fxlab'      => array( 'ACIDRATCHET_FX_LAB.html', 'FX Lab' ),
		'songbook'   => array( 'ACIDRATCHET_SONGBOOK.html', 'Songbook' ),
	);
}

/** Grund-URL eines Werkzeugs inkl. Cache-Bremse (Skin hängt das Script an). */
function acidratchet_tool_url( $tool ) {
	$tools = acidratchet_tools();
	$file  = isset( $tools[ $tool ] ) ? $tools[ $tool ][0] : 'index.html';
	return add_query_arg( array( 'v' => ACIDRATCHET_APP_VER ), ACIDRATCHET_URL . 'app/' . $file );
}

/**
 * Script + Styles der Widget-Hülle.
 * Alle Werkzeuge leben in EINEM Widget: je Werkzeug ein iFrame (gleiche Domain), angelegt beim
 * ersten Öffnen und danach nur ein-/ausgeblendet – der Synth spielt beim Umschalten weiter.
 * Sprünge aus den Werkzeugen (Links, „Synth öffnen“ usw.) rufen ACIDRATCHET_EMBED.open() auf.
 */
function acidratchet_register_assets() {
	wp_register_style( 'acidratchet-embed', false, array(), ACIDRATCHET_PLUGIN_VER );
	wp_add_inline_style(
		'acidratchet-embed',
		'.acidratchet-suite{width:100%;max-width:100%;background:#08090a;border-radius:12px;overflow:hidden;box-shadow:0 0 0 1px #2c3136}' .
		'.acidratchet-suite .ar-tabs{position:sticky;top:var(--ar-sticky-top,0px);z-index:20;display:flex;gap:6px;align-items:center;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:8px 10px;background:linear-gradient(180deg,#1d2023,#111315);border-bottom:1px solid #000;box-shadow:0 1px 0 #30353a}' .
		'.acidratchet-suite .ar-tabs.ar-hidden{display:none}' .
		'.acidratchet-suite .ar-tabs::-webkit-scrollbar{display:none}.acidratchet-suite .ar-tab{flex:0 0 auto;white-space:nowrap;appearance:none;cursor:pointer;font:600 12px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;color:#aeb6ae;background:linear-gradient(180deg,#2b2e32,#131517);border:1px solid #000;border-radius:6px;padding:10px 13px;box-shadow:0 0 0 1px #33383d,inset 0 1px 0 rgba(255,255,255,.08)}' .
		'.acidratchet-suite .ar-tab[aria-selected="true"]{color:#0b0d07;background:linear-gradient(180deg,#e2ff6a,#a6dc16);box-shadow:0 0 0 1px #000,0 0 12px rgba(200,255,46,.45)}' .
		'.acidratchet-suite .ar-full{margin-left:auto;font:12px ui-monospace,Menlo,monospace;color:#c8ff2e;text-decoration:none;padding:8px 6px}' .
		'.acidratchet-suite .ar-frame{display:block;width:100%;border:0;background:#08090a}' .
		'.acidratchet-suite .ar-frame[hidden]{display:none}' .
		'@media (max-width:480px){.acidratchet-suite .ar-tab{padding:9px 9px;font-size:11px}.acidratchet-suite .ar-full{display:none}}'
	);

	wp_register_script( 'acidratchet-embed', false, array(), ACIDRATCHET_PLUGIN_VER, true );
	wp_add_inline_script(
		'acidratchet-embed',
		<<<'JS'
(function(){
  if (window.ACIDRATCHET_EMBED) { window.ACIDRATCHET_EMBED.init(); return; }
  var FILES = {}; /* Datei -> Werkzeug, aus den Daten der Hüllen */
  function suites(){ return Array.prototype.slice.call(document.querySelectorAll('.acidratchet-suite')); }
  function cfg(s){ if(!s._ar){ s._ar = JSON.parse(s.getAttribute('data-ar')||'{}'); Object.keys(s._ar.tools||{}).forEach(function(k){ FILES[s._ar.tools[k].file]=k; }); } return s._ar; }
  function withParams(url, s){
    var u = new URL(url, location.href), c = cfg(s);
    if (!u.searchParams.get('v')) u.searchParams.set('v', c.ver);
    if (/\/index\.html$/.test(u.pathname) && !u.searchParams.get('skin')) u.searchParams.set('skin', c.skin === 'classic' ? 'off' : 'hw');
    return u.toString();
  }
  function fit(f){
    try{
      var d=f.contentDocument; if(!d||!d.documentElement) return;
      var set=function(){ if(f.hidden) return; var h=Math.max(d.documentElement.scrollHeight, d.body?d.body.scrollHeight:0); if(h>0) f.style.height=h+'px'; };
      set(); if(window.ResizeObserver&&d.body){ if(f._ro) f._ro.disconnect(); f._ro=new ResizeObserver(set); f._ro.observe(d.body); }
    }catch(e){}
  }
  function frameFor(s, tool, url){
    var box=s.querySelector('.ar-frames'), f=box.querySelector('iframe[data-tool="'+tool+'"]');
    if(!f){
      f=document.createElement('iframe'); f.className='ar-frame'; f.setAttribute('data-tool',tool);
      f.setAttribute('allow','autoplay; midi'); f.title='ACIDRATCHET '+cfg(s).tools[tool].label;
      f.style.height=(cfg(s).height||900)+'px';
      if(cfg(s).auto) f.addEventListener('load',function(){ fit(f); });
      f.src=withParams(url||cfg(s).tools[tool].url, s); box.appendChild(f);
    }
    return f;
  }
  function show(s, tool, url){
    var c=cfg(s); if(!c.tools[tool]) tool=c.start;
    var f=frameFor(s, tool, url);
    s.querySelectorAll('.ar-frame').forEach(function(x){ x.hidden = (x!==f); });
    s.querySelectorAll('.ar-tab').forEach(function(b){ b.setAttribute('aria-selected', b.getAttribute('data-tool')===tool ? 'true':'false'); });
    var full=s.querySelector('.ar-full'); if(full) full.href=f.src;
    if(c.auto) fit(f);
    var r=s.getBoundingClientRect(); if(r.top<0) s.scrollIntoView({block:'start'});
    s._arCur=tool;
  }
  function suiteOf(win){
    var found=null; suites().forEach(function(s){ s.querySelectorAll('iframe').forEach(function(f){ if(f.contentWindow===win) found=s; }); });
    return found;
  }
  window.ACIDRATCHET_EMBED = {
    open: function(url, srcWin){
      var s=suiteOf(srcWin); if(!s) return false;
      var abs=new URL(url, srcWin.location.href), file=abs.pathname.split('/').pop(), tool=FILES[file];
      if(!tool) return false;
      /* Läuft das Ziel schon, übernimmt es Pattern/FX über den gemeinsamen Speicher selbst – kein Neuladen. */
      show(s, tool, abs.toString());
      return true;
    },
    init: function(){
      suites().forEach(function(s){
        if(s._arInit) return; s._arInit=1; var c=cfg(s);
        s.querySelectorAll('.ar-tab').forEach(function(b){ b.addEventListener('click', function(){ show(s, b.getAttribute('data-tool')); }); });
        show(s, c.start);
      });
    }
  };
  if(document.readyState!=='loading') window.ACIDRATCHET_EMBED.init(); else document.addEventListener('DOMContentLoaded', window.ACIDRATCHET_EMBED.init);
  window.addEventListener('elementor/frontend/init', function(){ setTimeout(window.ACIDRATCHET_EMBED.init, 300); });
})();
JS
	);
}
add_action( 'init', 'acidratchet_register_assets' );

/**
 * Ausgabe für Shortcode und Elementor-Widget.
 *
 * @param array $a tool (Start-Werkzeug), skin (hw|classic), height (auto|Pixel), menu (1|0), fullscreen (1|0).
 */
function acidratchet_render( $a ) {
	$a = wp_parse_args(
		$a,
		array(
			'tool'       => 'synth',
			'skin'       => 'hw',
			'height'     => 'auto',
			'menu'       => '1',
			'fullscreen' => '1',
		)
	);
	$tools = acidratchet_tools();
	$start = isset( $tools[ $a['tool'] ] ) ? $a['tool'] : 'synth';
	$auto  = ( 'auto' === $a['height'] || '' === $a['height'] );
	$menu  = ( '1' === (string) $a['menu'] || 'yes' === $a['menu'] );
	$full  = ( '1' === (string) $a['fullscreen'] || 'yes' === $a['fullscreen'] );

	$data = array(
		'ver'    => ACIDRATCHET_APP_VER,
		'start'  => $start,
		'skin'   => ( 'classic' === $a['skin'] ) ? 'classic' : 'hw',
		'auto'   => $auto,
		'height' => $auto ? 900 : max( 300, absint( $a['height'] ) ),
		'tools'  => array(),
	);
	foreach ( $tools as $key => $t ) {
		$data['tools'][ $key ] = array(
			'file'  => $t[0],
			'label' => $t[1],
			'url'   => acidratchet_tool_url( $key ),
		);
	}

	wp_enqueue_style( 'acidratchet-embed' );
	wp_enqueue_script( 'acidratchet-embed' );

	$html  = '<div class="acidratchet-suite" data-ar="' . esc_attr( wp_json_encode( $data ) ) . '">';
	$html .= '<div class="ar-tabs' . ( $menu ? '' : ' ar-hidden' ) . '" role="tablist">';
	foreach ( $tools as $key => $t ) {
		$html .= sprintf(
			'<button type="button" class="ar-tab" role="tab" data-tool="%1$s" aria-selected="%2$s">%3$s</button>',
			esc_attr( $key ),
			$key === $start ? 'true' : 'false',
			esc_html( $t[1] )
		);
	}
	if ( $full ) {
		$html .= sprintf( '<a class="ar-full" href="%s" target="_blank" rel="noopener">%s</a>', esc_url( acidratchet_tool_url( $start ) ), esc_html__( 'Vollbild ↗', 'acidratchet' ) );
	}
	$html .= '</div><div class="ar-frames"></div>';
	$html .= sprintf(
		'<noscript><iframe src="%s" style="width:100%%;height:1400px;border:0" allow="autoplay; midi" title="ACIDRATCHET"></iframe></noscript>',
		esc_url( acidratchet_tool_url( $start ) )
	);
	$html .= '</div>';
	return $html;
}

/** Shortcode: [acidratchet tool="synth" skin="hw" height="auto" menu="1" fullscreen="1"] */
function acidratchet_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'tool'       => 'synth',
			'skin'       => 'hw',
			'height'     => 'auto',
			'menu'       => '1',
			'fullscreen' => '1',
		),
		$atts,
		'acidratchet'
	);
	return acidratchet_render( $atts );
}
add_shortcode( 'acidratchet', 'acidratchet_shortcode' );

/** Elementor-Widget nur laden, wenn Elementor aktiv ist. */
function acidratchet_register_elementor_widget( $widgets_manager ) {
	require_once ACIDRATCHET_DIR . 'class-acidratchet-elementor.php';
	$widgets_manager->register( new \Acidratchet_Elementor_Widget() );
}
add_action( 'elementor/widgets/register', 'acidratchet_register_elementor_widget' );
