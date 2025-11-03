'use client';

import { useState, useEffect } from 'react';
import { ControlView } from './control-view';

interface ControlTabProps {
	projectId: string;
}

export function ControlTab({ projectId }: ControlTabProps) {
	return <ControlView projectId={projectId} />;
}

