import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Platform, StyleSheet, Text, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import { Maximize, Minus, Plus } from 'lucide-react-native';
import { boundDiagram, MAX_DIAGRAM_ZOOM, MIN_DIAGRAM_ZOOM, zoomDiagram,
  type DiagramPoint, type DiagramSize, type DiagramTransform } from '../lib/diagramViewport';
import { t } from '../i18n/locale';
import { useLanguage } from '../i18n/useLanguage';
import { theme } from '../theme';
import { IconButton } from './IconButton';

export function ZoomableDiagram({ width, height, rotated = false, children }: {
  width: number; height: number; rotated?: boolean; children: ReactNode;
}) {
  useLanguage();
  const host = useRef<View>(null);
  const [viewport, setViewport] = useState<DiagramSize>({ width: 1, height: 1 });
  const [transform, setTransform] = useState<DiagramTransform>({ x: 0, y: 0, scale: 1 });
  const current = useRef(transform);
  const dimensions = useRef({ viewport, content: { width, height } });
  dimensions.current = { viewport, content: { width, height } };
  const gesture = useRef<{ start: DiagramTransform; center: DiagramPoint; distance: number; count: number } | null>(null);
  const setPosition = useCallback((value: DiagramTransform) => {
    const next = boundDiagram(value, dimensions.current.viewport, dimensions.current.content);
    current.current = next; setTransform(next);
  }, []);
  const resize = useCallback((size: DiagramSize) => {
    if (size.width <= 0 || size.height <= 0) return;
    setViewport(previous => previous.width === size.width && previous.height === size.height ? previous : size);
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = host.current as unknown as HTMLElement;
    // Layout dimensions remain unrotated, unlike a transformed bounding rectangle.
    const measure = () => resize({ width: node.clientWidth, height: node.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(node); measure();
    return () => observer.disconnect();
  }, [resize]);
  useEffect(() => { setPosition(current.current); }, [width, height, viewport, setPosition]);
  const points = useCallback((event: GestureResponderEvent) => {
    const rect = Platform.OS === 'web' ? (host.current as unknown as HTMLElement)?.getBoundingClientRect() : null;
    return [...event.nativeEvent.touches].map(touch => rect
      ? rotated ? { x: touch.pageY - rect.top - window.scrollY, y: rect.right - touch.pageX + window.scrollX }
        : { x: touch.pageX - rect.left - window.scrollX, y: touch.pageY - rect.top - window.scrollY }
      : { x: touch.locationX, y: touch.locationY });
  }, [rotated]);
  const sample = useCallback((event: GestureResponderEvent) => {
    const touches = points(event);
    if (!touches.length) return null;
    const first = touches[0]!, second = touches[1];
    return { count: touches.length, center: second ? { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 } : first,
      distance: second ? Math.hypot(first.x - second.x, first.y - second.y) : 0 };
  }, [points]);
  const begin = useCallback((event: GestureResponderEvent) => {
    const value = sample(event);
    gesture.current = value ? { ...value, start: current.current } : null;
  }, [sample]);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: begin,
    onPanResponderStart: begin,
    onPanResponderMove: event => {
      const next = sample(event), previous = gesture.current;
      if (!next) return;
      if (!previous || next.count !== previous.count) { begin(event); return; }
      const scale = next.count >= 2 && previous.distance > 0
        ? previous.start.scale * next.distance / previous.distance : previous.start.scale;
      setPosition(zoomDiagram(previous.start, scale, previous.center, next.center,
        dimensions.current.viewport, dimensions.current.content));
    },
    onPanResponderEnd: begin,
    onPanResponderRelease: () => { gesture.current = null; },
    onPanResponderTerminate: () => { gesture.current = null; },
    onPanResponderTerminationRequest: () => false,
  }), [begin, sample, setPosition]);
  const changeZoom = (factor: number) => {
    const center = { x: viewport.width / 2, y: viewport.height / 2 };
    setPosition(zoomDiagram(current.current, current.current.scale * factor, center, center, viewport, { width, height }));
  };
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = host.current as unknown as HTMLElement;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const center = rotated ? { x: event.clientY - rect.top, y: rect.right - event.clientX }
        : { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const { viewport: size, content } = dimensions.current;
      if (event.ctrlKey || event.metaKey) setPosition(zoomDiagram(current.current,
        current.current.scale * Math.exp(-event.deltaY * 0.002), center, center, size, content));
      else setPosition({ ...current.current, x: current.current.x - (rotated ? event.deltaY : event.deltaX),
        y: current.current.y - (rotated ? -event.deltaX : event.deltaY) });
    };
    const key = (event: KeyboardEvent) => {
      const shifts: Record<string, [number, number]> = { ArrowLeft: [80, 0], ArrowRight: [-80, 0],
        ArrowUp: [0, 80], ArrowDown: [0, -80], PageUp: [0, dimensions.current.viewport.height * 0.8], PageDown: [0, -dimensions.current.viewport.height * 0.8] };
      const shift = shifts[event.key];
      if (shift) { event.preventDefault(); setPosition({ ...current.current, x: current.current.x + shift[0], y: current.current.y + shift[1] }); }
    };
    node.addEventListener('wheel', wheel, { passive: false }); node.addEventListener('keydown', key);
    return () => { node.removeEventListener('wheel', wheel); node.removeEventListener('keydown', key); };
  }, [rotated, setPosition]);
  return <View style={styles.viewer}>
    <Text style={styles.hint}>{t('Pincez pour zoomer · Glissez pour déplacer')}</Text>
    <View ref={host} {...pan.panHandlers} style={[styles.viewport, Platform.OS === 'web' && webTouchStyle]}
      testID="diagram-viewport" tabIndex={0} onLayout={event => {
        if (Platform.OS !== 'web') resize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height });
      }}>
      <View pointerEvents="none" style={{ width, height, transformOrigin: 'top left',
        transform: [{ translateX: transform.x }, { translateY: transform.y }, { scale: transform.scale }] }}>
        {children}
      </View>
    </View>
    <View style={styles.controls}>
      <IconButton icon={Minus} label={t('Dézoomer le diagramme')} disabled={transform.scale <= MIN_DIAGRAM_ZOOM} onPress={() => changeZoom(1 / 1.25)} />
      <Text style={styles.percent}>{Math.round(transform.scale * 100)} %</Text>
      <IconButton icon={Plus} label={t('Zoomer le diagramme')} disabled={transform.scale >= MAX_DIAGRAM_ZOOM} onPress={() => changeZoom(1.25)} />
      <IconButton icon={Maximize} label={t('Ajuster le diagramme à la largeur')} onPress={() => setPosition({ x: 0, y: 0, scale: Math.min(1, viewport.width / width) })} />
    </View>
  </View>;
}

const webTouchStyle = { touchAction: 'none', userSelect: 'none' } as ViewStyle;
const styles = StyleSheet.create({
  viewer: { flex: 1 },
  viewport: { flex: 1, overflow: 'hidden' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm,
    padding: theme.spacing.xs, borderTopWidth: theme.size.borderWidth, borderTopColor: theme.colors.border },
  percent: { ...theme.typography.bodySmall, ...theme.typography.amount, color: theme.colors.textSubtle, minWidth: 60, textAlign: 'center' },
  hint: { ...theme.typography.caption, color: theme.colors.textSubtle, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.xs },
});
