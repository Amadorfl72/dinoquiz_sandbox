import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
import { responsive } from '../constants/styles';

export default function useResponsive() {
  const [dimensions, setDimensions] = useState({
    window: Dimensions.get('window'),
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ window });
    });
    return () => subscription?.remove();
  }, []);

  const getResponsiveStyle = () => {
    const { width } = dimensions.window;
    if (width < 600) return responsive.small;
    if (width < 900) return responsive.medium;
    return responsive.large;
  };

  return getResponsiveStyle();
}