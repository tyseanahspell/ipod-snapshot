import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { VideoItem } from '../types';

export function VideoScreen({
  item,
  playing,
  onEnded,
}: {
  item: VideoItem;
  playing: boolean;
  onEnded?: () => void;
}) {
  const player = useVideoPlayer(item.uri, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    player.replace(item.uri);
    player.play();
  }, [item.uri, player]);

  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [playing, player]);

  useEffect(() => {
    const sub = player.addListener('playToEnd', () => onEnded?.());
    return () => sub.remove();
  }, [player, onEnded]);

  return (
    <View style={styles.wrap}>
      <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
});
