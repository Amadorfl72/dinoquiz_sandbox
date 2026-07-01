import android.content.Context;
import android.view.View;

import org.hamcrest.Description;
import org.hamcrest.TypeSafeMatcher;

public class MinimumSizeMatcher {

    public static TypeSafeMatcher<View> hasMinimumSizeDp(final int minWidthDp, final int minHeightDp) {
        return new TypeSafeMatcher<View>() {
            @Override
            protected boolean matchesSafely(View view) {
                Context context = view.getContext();
                float scale = context.getResources().getDisplayMetrics().density;
                int minWidthPx = (int) (minWidthDp * scale + 0.5f);
                int minHeightPx = (int) (minHeightDp * scale + 0.5f);

                return view.getWidth() >= minWidthPx && view.getHeight() >= minHeightPx;
            }

            @Override
            public void describeTo(Description description) {
                description.appendText("View should have minimum width of " + minWidthDp + "dp and minimum height of " + minHeightDp + "dp");
            }

            @Override
            public void describeMismatchSafely(View view, Description mismatchDescription) {
                mismatchDescription.appendText("was width: ").appendValue(view.getWidth())
                        .appendText("px, height: ").appendValue(view.getHeight()).appendText("px");
            }
        };
    }
}