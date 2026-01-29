import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  FastForward,
  Calendar,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

export default function ReplayControls({
  isReplayMode,
  onToggleReplay,
  isPaused,
  onTogglePause,
  onStepForward,
  onStepBack,
  onReset,
  playSpeed,
  onSpeedChange,
  currentCandle,
  totalCandles,
  replayDate,
  availableDates,
  onDateChange
}) {
  if (!isReplayMode) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            Replay Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              Practice trading with historical data. Step through past trading days candle by candle.
            </p>
            <Button 
              onClick={onToggleReplay}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Replay Mode
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const progress = totalCandles > 0 ? (currentCandle / totalCandles * 100).toFixed(1) : 0;
  const currentTime = format(new Date().setHours(9, 15 + currentCandle * 5, 0, 0), 'HH:mm');
  
  return (
    <Card className="bg-purple-950/20 border-purple-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
            Replay Mode Active
          </CardTitle>
          <Button 
            onClick={onToggleReplay}
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300"
          >
            Exit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <Select value={replayDate} onValueChange={onDateChange}>
            <SelectTrigger className="bg-slate-800 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableDates.map(date => (
                <SelectItem key={date} value={date}>
                  {format(new Date(date), 'dd MMM yyyy')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Candle {currentCandle} / {totalCandles}</span>
            <span>{currentTime}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-center text-xs text-purple-400 font-semibold">
            {progress}% Complete
          </div>
        </div>
        
        {/* Playback Controls */}
        <div className="grid grid-cols-5 gap-2">
          <Button
            onClick={onReset}
            variant="outline"
            size="sm"
            className="bg-slate-800 border-slate-700"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            onClick={onStepBack}
            variant="outline"
            size="sm"
            className="bg-slate-800 border-slate-700"
            disabled={currentCandle === 0}
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            onClick={onTogglePause}
            size="sm"
            className={isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
          <Button
            onClick={onStepForward}
            variant="outline"
            size="sm"
            className="bg-slate-800 border-slate-700"
            disabled={currentCandle >= totalCandles}
          >
            <SkipForward className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => {
              // Fast forward to end
              const remaining = totalCandles - currentCandle;
              for (let i = 0; i < remaining; i++) {
                setTimeout(() => onStepForward(), i * 50);
              }
            }}
            variant="outline"
            size="sm"
            className="bg-slate-800 border-slate-700"
          >
            <FastForward className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Speed Control */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400">Playback Speed</label>
          <Select value={playSpeed.toString()} onValueChange={(v) => onSpeedChange(parseInt(v))}>
            <SelectTrigger className="bg-slate-800 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="500">0.5x (Slow)</SelectItem>
              <SelectItem value="1000">1x (Normal)</SelectItem>
              <SelectItem value="1500">1.5x (Fast)</SelectItem>
              <SelectItem value="2000">2x (Very Fast)</SelectItem>
              <SelectItem value="3000">3x (Ultra Fast)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Info */}
        <div className="p-2 bg-purple-950/30 rounded text-xs text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>Status:</span>
            <Badge variant="outline" className={isPaused ? 'text-amber-400 border-amber-400' : 'text-green-400 border-green-400'}>
              {isPaused ? 'Paused' : 'Playing'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Speed:</span>
            <span className="text-white">{(playSpeed / 1000).toFixed(1)}x</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}