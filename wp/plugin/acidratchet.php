<?php
/**
 * Plugin Name:       ACIDRATCHET
 * Description:       ACIDRATCHET Acid-Synth-Suite (Synth, Pattern Studio, FX Lab, Songbook) auf der eigenen Seite. Elementor-Widget „ACIDRATCHET“ oder Shortcode [acidratchet].
 * Version:           1.0.0
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

define( 'ACIDRATCHET_PLUGIN_VER', '1.0.0' );
define( 'ACIDRATCHET_APP_VER', '{{APPVER}}' );
define( 'ACIDRATCHET_DIR', plugin_dir_path( __FILE__ ) );
define( 'ACIDRATCHET_URL', plugin_dir_url( __FILE__ ) );

/** Werkzeuge der Suite: Schlüssel => [Datei, Anzeigename]. */
function acidratchet_tools() {
	return array(
		'synth'      => array( 'index.html', 'Synth' ),
		'translator' => array( 'ACIDRATCHET_TD3MO_TRANSLATOR.html', 'Pattern Studio' ),
		'fxlab'      => array( 'ACIDRATCHET_FX_LAB.html', 'FX Lab' ),
		'songbook'   => array( 'ACIDRATCHET_SONGBOOK.html', 'Songbook' ),
	);
}

/** URL eines Werkzeugs inkl. Skin und Cache-Bremse. */
function acidratchet_tool_url( $tool, $skin ) {
	$tools = acidratchet_tools();
	$file  = isset( $tools[ $tool ] ) ? $tools[ $tool ][0] : 'index.html';
	$args  = array( 'v' => ACIDRATCHET_APP_VER );
	if ( 'synth' === $tool ) {
		$args['skin'] = ( 'classic' === $skin ) ? 'off' : 'hw';
	}
	return add_query_arg( $args, ACIDRATCHET_URL . 'app/' . $file );
}

/** Kleines Script: iFrame wächst mit dem Inhalt (gleiche Domain, daher erlaubt). */
function acidratchet_register_assets() {
	wp_register_script( 'acidratchet-embed', false, array(), ACIDRATCHET_PLUGIN_VER, true );
	wp_add_inline_script(
		'acidratchet-embed',
		'(function(){function fit(f){try{var d=f.contentDocument;if(!d||!d.documentElement)return;' .
		'var set=function(){var h=Math.max(d.documentElement.scrollHeight,d.body?d.body.scrollHeight:0);if(h>0)f.style.height=h+"px";};' .
		'set();if(window.ResizeObserver&&d.body){if(f._acidRO)f._acidRO.disconnect();f._acidRO=new ResizeObserver(set);f._acidRO.observe(d.body);}}catch(e){}}' .
		'function init(){document.querySelectorAll("iframe.acidratchet-frame[data-autoheight=\'1\']").forEach(function(f){' .
		'if(f._acidInit)return;f._acidInit=1;f.addEventListener("load",function(){fit(f);});fit(f);});}' .
		'if(document.readyState!=="loading")init();else document.addEventListener("DOMContentLoaded",init);' .
		'window.addEventListener("elementor/frontend/init",function(){setTimeout(init,300);});})();'
	);
}
add_action( 'init', 'acidratchet_register_assets' );

/**
 * Ausgabe für Shortcode und Elementor-Widget.
 *
 * @param array $a tool, skin (hw|classic), height (auto|Pixel), fullscreen (1|0).
 */
function acidratchet_render( $a ) {
	$a = wp_parse_args(
		$a,
		array(
			'tool'       => 'synth',
			'skin'       => 'hw',
			'height'     => 'auto',
			'fullscreen' => '1',
		)
	);
	$tools = acidratchet_tools();
	$tool  = isset( $tools[ $a['tool'] ] ) ? $a['tool'] : 'synth';
	$url   = acidratchet_tool_url( $tool, $a['skin'] );
	$auto  = ( 'auto' === $a['height'] || '' === $a['height'] );
	$px    = $auto ? 900 : max( 300, absint( $a['height'] ) );

	wp_enqueue_script( 'acidratchet-embed' );

	$html  = '<div class="acidratchet-embed" style="width:100%;max-width:100%;">';
	$html .= sprintf(
		'<iframe class="acidratchet-frame" src="%1$s" title="%2$s" allow="autoplay; midi" data-autoheight="%3$s" style="display:block;width:100%%;height:%4$dpx;border:0;background:#08090a;border-radius:10px;" loading="lazy"></iframe>',
		esc_url( $url ),
		esc_attr( 'ACIDRATCHET ' . $tools[ $tool ][1] ),
		$auto ? '1' : '0',
		$px
	);
	if ( '1' === (string) $a['fullscreen'] || 'yes' === $a['fullscreen'] ) {
		$html .= sprintf(
			'<p style="margin:8px 0 0;text-align:right;font-size:13px;"><a href="%s" target="_blank" rel="noopener">%s</a></p>',
			esc_url( $url ),
			esc_html__( 'Im Vollbild öffnen ↗', 'acidratchet' )
		);
	}
	$html .= '</div>';
	return $html;
}

/** Shortcode: [acidratchet tool="synth" skin="hw" height="auto" fullscreen="1"] */
function acidratchet_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'tool'       => 'synth',
			'skin'       => 'hw',
			'height'     => 'auto',
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
