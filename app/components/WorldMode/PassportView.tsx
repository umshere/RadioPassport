
import React from 'react';
import { PassportEntry } from '~/types/world';
import { Group, Card, Text, Avatar, Badge, Timeline } from '@mantine/core';
import { IconPlaneDeparture, IconMusic } from '@tabler/icons-react';
import ReactCountryFlag from 'react-country-flag';

interface PassportViewProps {
    entries: PassportEntry[];
}

export function PassportView({ entries }: PassportViewProps) {
    if (entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center opacity-40">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <IconPlaneDeparture size={32} />
                </div>
                <Text size="xl" fw={700} tt="uppercase" style={{ letterSpacing: '0.1em' }}>Empty Passport</Text>
                <Text size="sm" mt="sm" maw={300}>Your journey hasn't begun. Select a destination to stamp your first entry.</Text>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 animate-fade-in">
            <div className="flex items-center gap-4 mb-10 border-b border-white/10 pb-6">
                <div className="w-12 h-12 bg-[var(--rp-gold)] rounded-xl flex items-center justify-center shadow-[0_12px_24px_rgba(245,177,45,0.35)]">
                    <IconPlaneDeparture className="text-black" size={24} />
                </div>
                <div>
                    <Text size="xl" fw={900} tt="uppercase" className="leading-none text-[var(--rp-text)] tracking-tight">My Passport</Text>
                    <Text size="xs" c="var(--rp-muted-2)" tt="uppercase" mt={4} style={{ letterSpacing: '0.2em' }}>
                        {entries.length} Destinations Visited
                    </Text>
                </div>
            </div>

            <Timeline active={-1} bulletSize={32} lineWidth={2}>
                {entries.map((entry, index) => (
                    <Timeline.Item
                        key={`${entry.id}-${entry.timestamp}`}
                        bullet={
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-black border border-white/20 flex items-center justify-center">
                                <ReactCountryFlag countryCode={entry.countryCode || ""} svg style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                            </div>
                        }
                        lineVariant={index === entries.length - 1 ? 'dashed' : 'solid'}
                    >
                        <Card
                            radius="lg"
                            p="md"
                            className="bg-black/40 border border-white/10 hover:bg-black/60 hover:border-white/20 transition-all duration-300 group cursor-pointer backdrop-blur-sm"
                        >
                            <Group justify="space-between" wrap="nowrap">
                                <div className="flex items-start gap-3">
                                    {entry.favicon && (
                                        <Avatar src={entry.favicon} radius="sm" size="md" className="opacity-80 group-hover:opacity-100 transition-opacity" />
                                    )}
                                    <div>
                                        <Text size="sm" fw={700} c="var(--rp-text)" className="leading-tight group-hover:text-[var(--rp-gold)] transition-colors">
                                            {entry.stationName}
                                        </Text>
                                        <Text size="xs" c="var(--rp-muted)" mt={2} className="flex items-center gap-1">
                                            <IconMusic size={10} /> {entry.country}
                                        </Text>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge variant="light" color="gray" size="xs" radius="sm" className="bg-black/40 text-[var(--rp-muted)] border border-white/10">
                                        {new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </Badge>
                                    <Text size="xs" c="var(--rp-muted-2)" mt={2} className="font-mono opacity-70">
                                        {new Date(entry.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </div>
                            </Group>
                        </Card>
                    </Timeline.Item>
                ))}
            </Timeline>
        </div>
    );
}
