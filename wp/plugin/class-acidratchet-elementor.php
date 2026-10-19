<?php
/**
 * Elementor-Widget „ACIDRATCHET“.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Acidratchet_Elementor_Widget extends \Elementor\Widget_Base {

	public function get_name() {
		return 'acidratchet';
	}

	public function get_title() {
		return 'ACIDRATCHET';
	}

	public function get_icon() {
		return 'eicon-headphones';
	}

	public function get_categories() {
		return array( 'general' );
	}

	public function get_keywords() {
		return array( 'acid', 'synth', '303', 'acidratchet', 'music' );
	}

	public function get_script_depends() {
		return array( 'acidratchet-embed' );
	}

	public function get_style_depends() {
		return array( 'acidratchet-embed' );
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_app',
			array(
				'label' => 'ACIDRATCHET',
				'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
			)
		);

		$options = array();
		foreach ( acidratchet_tools() as $key => $tool ) {
			$options[ $key ] = $tool[1];
		}
		$this->add_control(
			'tool',
			array(
				'label'   => 'Start-Werkzeug',
				'type'    => \Elementor\Controls_Manager::SELECT,
				'default' => 'synth',
				'options' => $options,
			)
		);

		$this->add_control(
			'skin',
			array(
				'label'     => 'Optik',
				'type'      => \Elementor\Controls_Manager::SELECT,
				'default'   => 'hw',
				'options'   => array(
					'hw'      => 'Hardware (HW)',
					'classic' => 'Klassisch',
				),
			)
		);

		$this->add_control(
			'menu',
			array(
				'label'        => 'Menüleiste (Synth · Pattern Studio · FX Lab · Songbook)',
				'type'         => \Elementor\Controls_Manager::SWITCHER,
				'label_on'     => 'An',
				'label_off'    => 'Aus',
				'return_value' => 'yes',
				'default'      => 'yes',
			)
		);

		$this->add_control(
			'height_mode',
			array(
				'label'   => 'Höhe',
				'type'    => \Elementor\Controls_Manager::SELECT,
				'default' => 'auto',
				'options' => array(
					'auto'  => 'Automatisch (wächst mit)',
					'fixed' => 'Fest',
				),
			)
		);

		$this->add_control(
			'height',
			array(
				'label'     => 'Höhe in Pixel',
				'type'      => \Elementor\Controls_Manager::NUMBER,
				'min'       => 300,
				'max'       => 6000,
				'step'      => 10,
				'default'   => 1200,
				'condition' => array( 'height_mode' => 'fixed' ),
			)
		);

		$this->add_control(
			'fullscreen',
			array(
				'label'        => 'Link „Vollbild“',
				'type'         => \Elementor\Controls_Manager::SWITCHER,
				'label_on'     => 'An',
				'label_off'    => 'Aus',
				'return_value' => 'yes',
				'default'      => 'yes',
			)
		);

		$this->end_controls_section();
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		echo acidratchet_render( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- in acidratchet_render escaped.
			array(
				'tool'       => isset( $s['tool'] ) ? $s['tool'] : 'synth',
				'skin'       => isset( $s['skin'] ) ? $s['skin'] : 'hw',
				'height'     => ( isset( $s['height_mode'] ) && 'fixed' === $s['height_mode'] ) ? (string) absint( $s['height'] ) : 'auto',
				'menu'       => ( ! isset( $s['menu'] ) || 'yes' === $s['menu'] ) ? '1' : '0',
				'fullscreen' => ( isset( $s['fullscreen'] ) && 'yes' === $s['fullscreen'] ) ? '1' : '0',
			)
		);
	}
}
