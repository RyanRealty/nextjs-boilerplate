// Aspect-aware safe zone constants exposed as a React context + hook.
// No other component may render into the caption Y-band returned here.

import React, { createContext, useContext } from 'react'
import { DIMS, type Aspect, type CompositionDims } from './brand'

const SafeZoneContext = createContext<CompositionDims>(DIMS['9x16'])

export const SafeZoneProvider: React.FC<{
  aspect: Aspect
  children: React.ReactNode
}> = ({ aspect, children }) => (
  <SafeZoneContext.Provider value={DIMS[aspect]}>
    {children}
  </SafeZoneContext.Provider>
)

export const useSafeZone = (): CompositionDims => useContext(SafeZoneContext)
