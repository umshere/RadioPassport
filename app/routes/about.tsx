import { Container, Title, Text, Group, Button, Stack, Card, SimpleGrid, ThemeIcon, Divider, Tooltip } from "@mantine/core";
import { Link } from "@remix-run/react";
import {
    IconArrowRight,
    IconBolt,
    IconBrandFacebook,
    IconBrandGithub,
    IconBrandInstagram,
    IconCompass,
    IconHeadphones,
    IconMail,
    IconRadio,
    IconSparkles,
} from "@tabler/icons-react";

export const meta = () => [
    { title: "About Radio Passport | Discover Global Radio" },
    { name: "description", content: "Radio Passport is a curated live radio discovery experience built to help listeners find the right station quickly." },
];

export default function About() {
    return (
        <div
            className="min-h-screen py-14 lg:py-20"
            style={{
                background:
                    "radial-gradient(circle at 12% 10%, rgba(245, 177, 45, 0.16), transparent 55%), radial-gradient(circle at 80% 0%, rgba(92, 158, 173, 0.18), transparent 45%), linear-gradient(180deg, #0b0c10 0%, #0f1118 100%)",
            }}
        >
            <Container size="lg">
                {/* Hero Section */}
                <Stack gap="xl" align="center" mb={60}>
                    <div className="text-center">
                        <Text className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--rp-muted-2)]">
                            About the Studio
                        </Text>
                        <Title
                            order={1}
                            className="text-4xl lg:text-6xl font-semibold text-[var(--rp-text)] mt-3"
                            style={{ lineHeight: 1.08 }}
                        >
                            Radio Passport is curated live radio discovery.
                        </Title>
                        <Text
                            size="lg"
                            className="text-[var(--rp-muted)] max-w-2xl mx-auto mt-4"
                        >
                            Built to make radio feel cinematic again without making discovery feel complicated,
                            so you can move from moods and regions into strong live stations with less friction.
                        </Text>
                    </div>
                </Stack>

                {/* Vision Statement */}
                <Card
                    withBorder
                    radius="xl"
                    p="xl"
                    mb={60}
                    className="border-white/10 bg-white/5 backdrop-blur-lg shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
                >
                    <Stack gap="md">
                        <div>
                            <Title order={2} className="text-2xl font-semibold text-[var(--rp-text)] mb-3">
                                The Mission
                            </Title>
                            <Text size="md" className="text-[var(--rp-muted)] leading-relaxed">
                                Radio is still the most human medium. This project is about removing the clutter
                                around it so discovery feels immediate: useful moods, strong regional picks, live
                                context, and enough guidance to help you find something worth playing now.
                            </Text>
                        </div>
                        <div className="pt-4 border-t border-white/10">
                            <Text size="md" className="text-[var(--rp-muted)] leading-relaxed italic">
                                "From small community stations to global broadcasters, Radio Passport turns
                                open-ended browsing into a tighter, more intentional listening ritual."
                            </Text>
                        </div>
                    </Stack>
                </Card>

                {/* Core Features */}
                <div className="mb-60">
                    <Title order={2} className="text-3xl font-semibold text-[var(--rp-text)] mb-8 text-center">
                        What Makes It Feel Different
                    </Title>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                        <FeatureCard
                            icon={<IconCompass size={24} />}
                            title="Guided Discovery"
                            description="Browse by mood, region, station strength, and listening context without splitting the experience into separate modes."
                        />
                        <FeatureCard
                            icon={<IconSparkles size={24} />}
                            title="Smart Curation"
                            description="AI-assisted picks help surface moods, regional scenes, and strong live stations that fit the moment."
                        />
                        <FeatureCard
                            icon={<IconHeadphones size={24} />}
                            title="Focused Listening"
                            description="Calm, cinematic, and tuned for long sessions without hiding the useful controls or next actions."
                        />
                        <FeatureCard
                            icon={<IconRadio size={24} />}
                            title="Reliable Streaming"
                            description="Fast station playback with resilience for dropouts and unreliable streams."
                        />
                        <FeatureCard
                            icon={<IconBolt size={24} />}
                            title="Live Status"
                            description="We surface what's live and healthy so you can stay in the flow."
                        />
                        <FeatureCard
                            icon={<IconHeadphones size={24} />}
                            title="Device Friendly"
                            description="Works smoothly on desktop and mobile with a shared visual language."
                        />
                    </SimpleGrid>
                </div>

                {/* Current Status + Contact */}
                <Card
                    withBorder
                    radius="xl"
                    p="xl"
                    mb={60}
                    className="border-white/10 bg-white/5 backdrop-blur-lg"
                >
                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                        <div>
                            <Title order={2} className="text-2xl font-semibold text-[var(--rp-text)]">
                                Current Status
                            </Title>
                            <Text className="text-[var(--rp-muted)] mt-3 leading-relaxed">
                                Radio Passport is in active development with a live streaming core, evolving curated
                                discovery shelves, and regular UI refinements. The focus right now is stability, speed,
                                and making home the clearest place to start listening on desktop and mobile.
                            </Text>
                            <Divider my="lg" color="rgba(255,255,255,0.08)" />
                            <Group>
                                <Button
                                    component="a"
                                    href="https://github.com/umshere/RadioPassport/"
                                    target="_blank"
                                    rel="noreferrer"
                                    radius="xl"
                                    className="bg-[var(--rp-gold)] text-black hover:bg-[var(--rp-gold-strong)]"
                                    leftSection={<IconBrandGithub size={18} />}
                                >
                                    GitHub
                                </Button>
                                <Button
                                    component={Link}
                                    to="/"
                                    radius="xl"
                                    variant="light"
                                    className="text-[var(--rp-text)] border border-white/10 bg-white/5 hover:bg-white/10"
                                    rightSection={<IconArrowRight size={18} />}
                                >
                                    Start Listening
                                </Button>
                            </Group>
                        </div>
                        <div>
                            <Title order={3} className="text-xl font-semibold text-[var(--rp-text)]">
                                Contact + Connect
                            </Title>
                            <Text className="text-[var(--rp-muted)] mt-3">
                                Reach out for collaborations, feedback, or press.
                            </Text>
                            <Group gap="sm" mt="lg">
                                <IconLink
                                    icon={<IconMail size={18} />}
                                    label="Email"
                                    href="mailto:umshere@gmail.com"
                                    description="umshere@gmail.com"
                                />
                                <IconLink
                                    icon={<IconBrandGithub size={18} />}
                                    label="GitHub"
                                    href="https://github.com/umshere/RadioPassport/"
                                    description="github.com/umshere/RadioPassport"
                                />
                                <IconLink
                                    icon={<IconBrandFacebook size={18} />}
                                    label="Facebook"
                                    href="https://www.facebook.com/umesh.mc.79/"
                                    description="facebook.com/umesh.mc.79"
                                />
                                <IconLink
                                    icon={<IconBrandInstagram size={18} />}
                                    label="Instagram"
                                    href="https://www.instagram.com/umshere/"
                                    description="instagram.com/umshere"
                                />
                            </Group>
                        </div>
                    </SimpleGrid>
                </Card>

                {/* CTA Section */}
                <Stack gap="md" align="center" mb={40}>
                    <Title order={2} className="text-2xl font-semibold text-[var(--rp-text)] text-center">
                        Ready to Find Tonight's Station?
                    </Title>
                    <Link to="/">
                        <Button
                            size="lg"
                            radius="xl"
                            className="bg-[var(--rp-gold)] hover:bg-[var(--rp-gold-strong)] text-black"
                            rightSection={<IconArrowRight size={20} />}
                        >
                            Open Home
                        </Button>
                    </Link>
                </Stack>

                {/* Footer Info */}
                <div className="text-center pt-12 border-t border-white/10">
                    <Text size="sm" className="text-[var(--rp-muted-2)]">
                        Radio Passport © 2024–2025. Built with care for night owls and radio lovers.
                    </Text>
                </div>
            </Container>
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <Card
            withBorder
            radius="xl"
            p="md"
            className="border-white/10 bg-white/5 backdrop-blur-lg hover:bg-white/10 transition-colors"
        >
            <Group mb="xs">
                <ThemeIcon
                    size="lg"
                    radius="md"
                    variant="light"
                    className="bg-white/10 text-[var(--rp-gold)]"
                >
                    {icon}
                </ThemeIcon>
            </Group>
            <Text fw={600} size="md" className="text-[var(--rp-text)] mb-2">
                {title}
            </Text>
            <Text size="sm" className="text-[var(--rp-muted)]">
                {description}
            </Text>
        </Card>
    );
}

function IconLink({
    icon,
    label,
    href,
    description,
}: {
    icon: React.ReactNode;
    label: string;
    href: string;
    description: string;
}) {
    return (
        <Tooltip label={`${label} • ${description}`} position="top" withArrow>
            <a
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={`${label}: ${description}`}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[var(--rp-gold)] transition hover:bg-white/10 hover:text-[var(--rp-gold-strong)]"
            >
                {icon}
            </a>
        </Tooltip>
    );
}
