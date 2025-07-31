import React from "react";
import { PathwaysFlameGraph as FlameGraphComponent } from "./flame-graph";
import type { Pathway } from "../lib/api";

interface PathwaysFlameGraphProps {
	pathways: Pathway[];
}

const PathwaysFlameGraph: React.FC<PathwaysFlameGraphProps> = ({
	pathways,
}) => {
	return <FlameGraphComponent pathways={pathways} />;
};

export default PathwaysFlameGraph;
